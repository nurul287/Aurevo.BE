import { z } from "zod";

const genderEnum = z.enum(["men", "women", "unisex"]);

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    description: z.string().optional().nullable(),
    shortDescription: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    brandId: z.string().uuid().optional().nullable(),
    gender: genderEnum.default("unisex"),
    material: z.string().optional().nullable(),
    careInstructions: z.string().optional().nullable(),
    basePrice: z.number().positive(),
    compareAtPrice: z.number().positive().optional().nullable(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    trackInventory: z.boolean().default(true),
    allowBackorder: z.boolean().default(false),
    minOrderQuantity: z.number().int().positive().default(1),
    maxOrderQuantity: z.number().int().positive().optional().nullable(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().optional().nullable(),
    shortDescription: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    brandId: z.string().uuid().optional().nullable(),
    gender: genderEnum.optional(),
    material: z.string().optional().nullable(),
    careInstructions: z.string().optional().nullable(),
    basePrice: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional().nullable(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    trackInventory: z.boolean().optional(),
    allowBackorder: z.boolean().optional(),
    minOrderQuantity: z.number().int().positive().optional(),
    maxOrderQuantity: z.number().int().positive().optional().nullable(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const getProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    gender: genderEnum.optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    isActive: z.enum(["true", "false"]).optional(),
    isFeatured: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["name", "basePrice", "createdAt", "isFeatured"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const productIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const bulkStatusSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1),
    isActive: z.boolean(),
  }),
});

export const bulkDeleteSchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];
export type GetProductsInput = z.infer<typeof getProductsSchema>["query"];
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>["body"];
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>["body"];
