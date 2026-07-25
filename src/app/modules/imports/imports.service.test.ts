import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { db } from "../../../db";
import { importJobs, importRows } from "../../../db/schema";
import * as ImportsService from "./imports.service";
import type { ImportRowInput } from "./imports.service";
import type { NormalizedProduct } from "./imports.schema";

// Enqueuing hits real Redis (BullMQ) — irrelevant to this service's own logic
// (dedup, persistence, pagination) and this test suite shouldn't need a
// running Redis just to exercise it.
vi.mock("../../../lib/queue", () => ({
  enqueueImportJob: vi.fn().mockResolvedValue(undefined),
}));

async function cleanAll() {
  await db.delete(importRows);
  await db.delete(importJobs);
}

beforeEach(cleanAll);
afterAll(cleanAll);

function product(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    source: "spreadsheet",
    externalId: "ext-1",
    title: "Test Product",
    category: "shirt",
    gender: "unisex",
    basePrice: 999,
    tags: [],
    variants: [{}],
    images: [],
    ...overrides,
  };
}

function row(rowNumber: number, overrides: Partial<NormalizedProduct> = {}): ImportRowInput {
  return { rowNumber, product: product({ externalId: `ext-${rowNumber}`, ...overrides }) };
}

describe("createImportJob", () => {
  it("creates a job + one row per unique product and enqueues processing", async () => {
    const { job, rejected } = await ImportsService.createImportJob(
      "spreadsheet",
      [row(2), row(3)],
      [],
    );

    expect(job.totalRows).toBe(2);
    expect(job.status).toBe("pending");
    expect(rejected).toHaveLength(0);

    const rows = await db.select().from(importRows);
    expect(rows).toHaveLength(2);

    const { enqueueImportJob } = await import("../../../lib/queue");
    expect(enqueueImportJob).toHaveBeenCalledWith(job.id);
  });

  it("de-dupes rows sharing the same external_id within one upload, keeping the first and rejecting the rest", async () => {
    const dupe = row(2, { externalId: "same-id" });
    const dupeAgain = row(3, { externalId: "same-id" });

    const { job, rejected } = await ImportsService.createImportJob("spreadsheet", [dupe, dupeAgain], []);

    expect(job.totalRows).toBe(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.rowNumber).toBe(3);
    expect(rejected[0]!.error).toMatch(/duplicate/i);
  });

  it("merges parse errors and dedup rejections, sorted by row number", async () => {
    const parseErrors = [{ rowNumber: 5, error: "bad price" }];
    const { rejected } = await ImportsService.createImportJob(
      "spreadsheet",
      [row(2, { externalId: "dup" }), row(3, { externalId: "dup" })],
      parseErrors,
    );

    expect(rejected.map((r) => r.rowNumber)).toEqual([3, 5]);
  });

  it("does not enqueue a job when every row was rejected", async () => {
    vi.mocked((await import("../../../lib/queue")).enqueueImportJob).mockClear();

    const { job } = await ImportsService.createImportJob("spreadsheet", [], [{ rowNumber: 2, error: "bad" }]);

    expect(job.totalRows).toBe(0);
    const { enqueueImportJob } = await import("../../../lib/queue");
    expect(enqueueImportJob).not.toHaveBeenCalled();
  });
});

describe("getImportJob / listImportJobs", () => {
  it("404s for an unknown job", async () => {
    await expect(ImportsService.getImportJob("00000000-0000-0000-0000-000000000000")).rejects.toThrow();
  });

  it("lists jobs newest first with pagination", async () => {
    await ImportsService.createImportJob("spreadsheet", [row(2)], []);
    await ImportsService.createImportJob("spreadsheet", [row(2, { externalId: "ext-x" })], []);

    const { data, pagination } = await ImportsService.listImportJobs(1, 20);
    expect(data).toHaveLength(2);
    expect(pagination.total).toBe(2);
  });
});

describe("getImportRows", () => {
  it("404s if the job doesn't exist", async () => {
    await expect(
      ImportsService.getImportRows("00000000-0000-0000-0000-000000000000", undefined, 1, 20),
    ).rejects.toThrow();
  });

  it("filters rows by status", async () => {
    const { job } = await ImportsService.createImportJob("spreadsheet", [row(2), row(3)], []);
    const allRows = await db.select().from(importRows);
    await db.update(importRows).set({ status: "done" }).where((await import("drizzle-orm")).eq(importRows.id, allRows[0]!.id));

    const { data } = await ImportsService.getImportRows(job.id, "done", 1, 20);
    expect(data).toHaveLength(1);
  });
});

describe("retryFailedRows", () => {
  it("resets only failed rows back to pending and re-enqueues", async () => {
    const { job } = await ImportsService.createImportJob("spreadsheet", [row(2), row(3)], []);
    const rows = await db.select().from(importRows);
    const { eq } = await import("drizzle-orm");
    await db.update(importRows).set({ status: "done" }).where(eq(importRows.id, rows[0]!.id));
    await db.update(importRows).set({ status: "failed", error: "boom" }).where(eq(importRows.id, rows[1]!.id));
    await db.update(importJobs).set({ status: "partial", finishedAt: new Date().toISOString() }).where(eq(importJobs.id, job.id));

    const { retried } = await ImportsService.retryFailedRows(job.id);
    expect(retried).toBe(1);

    const updatedRows = await db.select().from(importRows).where(eq(importRows.jobId, job.id));
    const doneRow = updatedRows.find((r) => r.id === rows[0]!.id)!;
    const retriedRow = updatedRows.find((r) => r.id === rows[1]!.id)!;
    expect(doneRow.status).toBe("done"); // untouched
    expect(retriedRow.status).toBe("pending");
    expect(retriedRow.error).toBeNull();

    const [updatedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));
    expect(updatedJob!.status).toBe("pending");
    expect(updatedJob!.finishedAt).toBeNull();
  });

  it("does nothing when there are no failed rows", async () => {
    const { job } = await ImportsService.createImportJob("spreadsheet", [row(2)], []);
    const { retried } = await ImportsService.retryFailedRows(job.id);
    expect(retried).toBe(0);
  });
});
