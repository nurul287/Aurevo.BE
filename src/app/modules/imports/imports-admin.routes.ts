import { Router } from "express";
import multer from "multer";
import { authenticate, requireAdmin, uploadLimiter, validate } from "../../middlewares";
import {
  downloadTemplate,
  getImportJob,
  getImportRows,
  listImportJobs,
  retryImportJob,
  uploadImport,
} from "./imports.controller";
import {
  getImportJobsSchema,
  getImportRowsSchema,
  importJobParamsSchema,
} from "./imports.schema";

const router: Router = Router();

const SUPPORTED_MIME_PREFIXES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
  "application/json",
  "text/plain", // .csv/.ndjson from some clients report as text/plain
  "application/octet-stream", // browsers often send this for unfamiliar extensions
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB — a 1000-row sheet + this generosity comfortably covers it
  fileFilter: (_req, file, cb) => {
    if (SUPPORTED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) return cb(null, true);
    cb(new Error("Unsupported file type — upload .xlsx, .csv, .json, or .ndjson"));
  },
});

router.get("/template", authenticate, requireAdmin, downloadTemplate);

router.post("/", authenticate, requireAdmin, uploadLimiter, upload.single("file"), uploadImport);

router.get("/", authenticate, requireAdmin, validate(getImportJobsSchema), listImportJobs);

router.get("/:jobId", authenticate, requireAdmin, validate(importJobParamsSchema), getImportJob);

router.get("/:jobId/rows", authenticate, requireAdmin, validate(getImportRowsSchema), getImportRows);

router.post("/:jobId/retry", authenticate, requireAdmin, validate(importJobParamsSchema), retryImportJob);

export default router;
