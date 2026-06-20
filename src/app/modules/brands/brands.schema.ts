import { z } from "zod";

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    description: z.string().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    websiteUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().default(true),
  }),
});

export const updateBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    websiteUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const getBrandsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("name"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
});

export const brandIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>["body"];
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>["body"];
export type GetBrandsInput = z.infer<typeof getBrandsSchema>["query"];
