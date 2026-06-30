import { z } from "zod";

export const createVariantSchema = z.object({
  body: z.object({
    sku: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(255).optional(),
    size: z.string().max(50).optional(),
    color: z.string().max(100).optional(),
    colorCode: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Must be a valid hex color").optional(),
    material: z.string().max(255).optional(),
    weight: z.number().positive().optional(),
    price: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional(),
    barcode: z.string().max(100).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
    stock: z.number().int().min(0).default(0),
  }),
  params: z.object({ productId: z.string().uuid() }),
});

export const updateVariantSchema = z.object({
  body: z.object({
    sku: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(255).optional(),
    size: z.string().max(50).optional(),
    color: z.string().max(100).optional(),
    colorCode: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
    material: z.string().max(255).optional(),
    weight: z.number().positive().optional(),
    price: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional(),
    barcode: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }).refine(data => Object.keys(data).length > 0, { message: "At least one field is required" }),
  params: z.object({ productId: z.string().uuid(), id: z.string().uuid() }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    adjustment: z.number().int(),
    reason: z.string().min(1).max(255).optional(),
  }),
  params: z.object({ productId: z.string().uuid(), id: z.string().uuid() }),
});

export const variantParamsSchema = z.object({
  params: z.object({ productId: z.string().uuid(), id: z.string().uuid() }),
});

export const productParamsSchema = z.object({
  params: z.object({ productId: z.string().uuid() }),
});

export const bulkCreateVariantsSchema = z.object({
  body: z.object({
    variants: z.array(z.object({
      sku: z.string().min(1).max(100).optional(),
      name: z.string().min(1).max(255).optional(),
      size: z.string().max(50).optional(),
      color: z.string().max(100).optional(),
      color_code: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Must be a valid hex color").optional(),
      price: z.number().positive().optional(),
      compare_at_price: z.number().positive().optional(),
      sort_order: z.number().int().min(0).optional(),
      initial_stock: z.number().int().min(0).optional(),
    })).min(1, "At least one variant is required"),
  }),
  params: z.object({ productId: z.string().uuid() }),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>["body"];
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>["body"];
export type AdjustStockInput = z.infer<typeof adjustStockSchema>["body"];
export type BulkCreateVariantsInput = z.infer<typeof bulkCreateVariantsSchema>["body"];
