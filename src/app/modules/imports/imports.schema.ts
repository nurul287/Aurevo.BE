import { z } from "zod";

const genderEnum = z.enum(["men", "women", "unisex"]);

export const normalizedVariantSchema = z.object({
  size: z.string().max(50).optional(),
  color: z.string().max(100).optional(),
  colorCode: z.string().max(20).optional(),
  sku: z.string().max(100).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
});

export const normalizedImageSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  alt: z.string().max(255).optional(),
});

/**
 * The one shape everything converges on — spreadsheet rows are parsed into
 * this, and (later) the scraper produces it directly — so the import
 * pipeline itself is input-source-agnostic. See docs/xx-bulk-import.md.
 */
export const normalizedProductSchema = z.object({
  source: z.string().min(1).max(100),
  externalId: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  shortDescription: z.string().max(500).optional(),
  brand: z.string().max(255).optional(),
  category: z.string().min(1).max(100),
  gender: genderEnum.default("unisex"),
  basePrice: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
  variants: z.array(normalizedVariantSchema).min(1, "At least one variant (size/color row) is required"),
  images: z.array(normalizedImageSchema).default([]),
});

export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;
export type NormalizedVariant = z.infer<typeof normalizedVariantSchema>;
export type NormalizedImage = z.infer<typeof normalizedImageSchema>;

// ─── Route schemas ──────────────────────────────────────────────────────────

export const getImportJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
export type GetImportJobsQuery = z.infer<typeof getImportJobsSchema>["query"];

export const importJobParamsSchema = z.object({
  params: z.object({ jobId: z.string().uuid() }),
});

export const getImportRowsSchema = z.object({
  params: z.object({ jobId: z.string().uuid() }),
  query: z.object({
    status: z.enum(["pending", "processing", "done", "failed", "skipped"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }),
});
export type GetImportRowsQuery = z.infer<typeof getImportRowsSchema>["query"];
