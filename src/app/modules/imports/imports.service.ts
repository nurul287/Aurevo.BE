import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { importJobs, importRows } from "../../../db/schema";
import { NotFoundError } from "../../errors";
import { enqueueImportJob } from "../../../lib/queue";
import type { NormalizedProduct } from "./imports.schema";

export type ImportRowInput = { rowNumber: number; product: NormalizedProduct };
export type ImportRowRejection = { rowNumber: number; error: string };
export type ImportRowStatusFilter = "pending" | "processing" | "done" | "failed" | "skipped";

/**
 * Creates a job + its rows and enqueues processing. Rows sharing the same
 * externalId within this one upload are de-duplicated (first occurrence
 * wins, the rest surface as rejections) BEFORE insert — the DB's unique
 * index on (job_id, source, external_id) would otherwise reject the whole
 * batch insert rather than just the offending rows.
 */
export async function createImportJob(
  source: string,
  parsedRows: ImportRowInput[],
  parseErrors: ImportRowRejection[],
  createdBy?: string,
): Promise<{ job: typeof importJobs.$inferSelect; rejected: ImportRowRejection[] }> {
  const seen = new Map<string, ImportRowInput>();
  const dupRejections: ImportRowRejection[] = [];
  for (const row of parsedRows) {
    const key = row.product.externalId;
    if (seen.has(key)) {
      dupRejections.push({
        rowNumber: row.rowNumber,
        error: `Duplicate external_id "${key}" within this file — first occurrence used, this row skipped`,
      });
    } else {
      seen.set(key, row);
    }
  }
  const uniqueRows = [...seen.values()];
  const rejected = [...parseErrors, ...dupRejections].sort((a, b) => a.rowNumber - b.rowNumber);

  const [job] = await db
    .insert(importJobs)
    .values({ source, status: "pending", totalRows: uniqueRows.length, createdBy: createdBy ?? null })
    .returning();

  if (uniqueRows.length > 0) {
    await db.insert(importRows).values(
      uniqueRows.map((row) => ({
        jobId: job!.id,
        rowNumber: row.rowNumber,
        source,
        externalId: row.product.externalId,
        payload: row.product,
        status: "pending" as const,
      })),
    );
    await enqueueImportJob(job!.id);
  }

  return { job: job!, rejected };
}

export async function getImportJob(jobId: string) {
  const [job] = await db.select().from(importJobs).where(eq(importJobs.id, jobId));
  if (!job) throw new NotFoundError("Import job");
  return job;
}

export async function listImportJobs(page: number, limit: number) {
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(importJobs),
  ]);
  const totalCount = Number(total);
  return {
    data: rows,
    pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
  };
}

export async function getImportRows(
  jobId: string,
  status: ImportRowStatusFilter | undefined,
  page: number,
  limit: number,
) {
  await getImportJob(jobId); // 404s if the job itself doesn't exist

  const conditions = [eq(importRows.jobId, jobId)];
  if (status) conditions.push(eq(importRows.status, status));
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(importRows).where(where).orderBy(asc(importRows.rowNumber)).limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(importRows).where(where),
  ]);
  const totalCount = Number(total);
  return {
    data: rows,
    pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
  };
}

/**
 * Resets every `failed` row on a job back to `pending` and re-enqueues —
 * only failed rows are touched, so `done` rows from the original run are
 * left alone (no re-processing, no duplicate products).
 */
export async function retryFailedRows(jobId: string): Promise<{ retried: number }> {
  await getImportJob(jobId);

  const updated = await db
    .update(importRows)
    .set({ status: "pending", error: null, updatedAt: new Date().toISOString() })
    .where(and(eq(importRows.jobId, jobId), eq(importRows.status, "failed")))
    .returning({ id: importRows.id });

  if (updated.length > 0) {
    await db.update(importJobs).set({ status: "pending", finishedAt: null }).where(eq(importJobs.id, jobId));
    await enqueueImportJob(jobId);
  }

  return { retried: updated.length };
}
