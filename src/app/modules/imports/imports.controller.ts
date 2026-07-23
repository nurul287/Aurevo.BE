import { Request, Response, NextFunction } from "express";
import * as ImportsService from "./imports.service";
import { generateImportTemplate, parseSpreadsheet } from "./spreadsheet";
import { normalizedProductSchema } from "./imports.schema";
import { ValidationError } from "../../errors";
import type { GetImportJobsQuery, GetImportRowsQuery } from "./imports.schema";
import type { ImportRowInput, ImportRowRejection } from "./imports.service";

const SPREADSHEET_EXTENSIONS = ["xlsx", "xls", "csv"];

/** Validates one raw candidate object against the NormalizedProduct schema, stamping `source` if absent. */
function validateCandidate(raw: unknown, rowNumber: number, source: string): { row?: ImportRowInput; rejection?: ImportRowRejection } {
  const candidate = {
    ...(typeof raw === "object" && raw !== null ? raw : {}),
    source: (raw as { source?: string })?.source ?? source,
  };
  const parsed = normalizedProductSchema.safeParse(candidate);
  if (parsed.success) return { row: { rowNumber, product: parsed.data } };
  const message = parsed.error.issues.map((i) => `${i.path.join(".") || "(row)"}: ${i.message}`).join("; ");
  return { rejection: { rowNumber, error: message } };
}

/** Parses a raw candidate array (from a JSON body or a .json/.ndjson file) into rows + rejections. */
function parseCandidateArray(candidates: unknown[], source: string): { rows: ImportRowInput[]; errors: ImportRowRejection[] } {
  const rows: ImportRowInput[] = [];
  const errors: ImportRowRejection[] = [];
  candidates.forEach((raw, index) => {
    const { row, rejection } = validateCandidate(raw, index + 1, source);
    if (row) rows.push(row);
    if (rejection) errors.push(rejection);
  });
  return { rows, errors };
}

/**
 * Accepts one of three input shapes, all converging on the same
 * ImportsService.createImportJob call so the queue/worker never needs to
 * know which format was used:
 *  - a .xlsx/.csv file upload (the standard/primary path — parseSpreadsheet)
 *  - a .json (array) or .ndjson (one object per line) file upload
 *  - a raw JSON array body (small ad-hoc payloads only — the global body
 *    parser caps requests at 1mb; anything larger must be a file upload)
 */
export const uploadImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const source = (typeof req.body?.source === "string" && req.body.source.trim()) || "spreadsheet";
    let parsedRows: ImportRowInput[] = [];
    let parseErrors: ImportRowRejection[] = [];

    if (req.file) {
      const ext = req.file.originalname.split(".").pop()?.toLowerCase() ?? "";
      const text = () => req.file!.buffer.toString("utf-8");

      if (SPREADSHEET_EXTENSIONS.includes(ext)) {
        const result = parseSpreadsheet(req.file.buffer, source);
        parsedRows = result.rows;
        parseErrors = result.errors;
      } else if (ext === "json") {
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(text());
        } catch {
          throw new ValidationError("Invalid JSON file — could not parse as JSON");
        }
        if (!Array.isArray(parsedJson)) throw new ValidationError("JSON file must contain an array of products");
        ({ rows: parsedRows, errors: parseErrors } = parseCandidateArray(parsedJson, source));
      } else if (ext === "ndjson") {
        const lines = text().split("\n").map((l) => l.trim()).filter(Boolean);
        const candidates: unknown[] = [];
        lines.forEach((line, i) => {
          try {
            candidates.push(JSON.parse(line));
          } catch {
            parseErrors.push({ rowNumber: i + 1, error: "Invalid JSON on this line" });
          }
        });
        const result = parseCandidateArray(candidates, source);
        parsedRows = result.rows;
        parseErrors = [...parseErrors, ...result.errors].sort((a, b) => a.rowNumber - b.rowNumber);
      } else {
        throw new ValidationError(`Unsupported file type ".${ext}" — upload .xlsx, .csv, .json, or .ndjson`);
      }
    } else if (Array.isArray(req.body)) {
      ({ rows: parsedRows, errors: parseErrors } = parseCandidateArray(req.body, source));
    } else {
      throw new ValidationError('Upload a .xlsx/.csv/.json/.ndjson file (form field "file") or send a small JSON array body');
    }

    if (parsedRows.length === 0 && parseErrors.length === 0) {
      throw new ValidationError("No product rows found in the upload");
    }

    const { job, rejected } = await ImportsService.createImportJob(source, parsedRows, parseErrors, req.user?.id);
    res.status(201).json({
      success: true,
      data: { jobId: job.id, total: job.totalRows, status: job.status, rejected },
    });
  } catch (err) {
    next(err);
  }
};

export const downloadTemplate = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    const buffer = generateImportTemplate();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="product-import-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const listImportJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as unknown as GetImportJobsQuery;
    const { data, pagination } = await ImportsService.listImportJobs(page, limit);
    res.status(200).json({ success: true, data, meta: { pagination } });
  } catch (err) {
    next(err);
  }
};

export const getImportJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ImportsService.getImportJob(req.params.jobId!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getImportRows = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, page, limit } = req.query as unknown as GetImportRowsQuery;
    const { data, pagination } = await ImportsService.getImportRows(req.params.jobId!, status, page, limit);
    res.status(200).json({ success: true, data, meta: { pagination } });
  } catch (err) {
    next(err);
  }
};

export const retryImportJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ImportsService.retryFailedRows(req.params.jobId!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
