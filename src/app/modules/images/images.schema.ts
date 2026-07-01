import { z } from "zod";

export const updateImageSchema = z.object({
  body: z.object({
    altText: z.string().max(500).optional(),
    sortOrder: z.number().int().min(0).optional(),
    variantId: z.string().uuid().nullable().optional(),
  }).refine(data => Object.keys(data).length > 0, { message: "At least one field is required" }),
  params: z.object({ productId: z.string().uuid(), id: z.string().uuid() }),
});

export const imageParamsSchema = z.object({
  params: z.object({ productId: z.string().uuid(), id: z.string().uuid() }),
});

export const productParamsSchema = z.object({
  params: z.object({ productId: z.string().uuid() }),
});

export type UpdateImageInput = z.infer<typeof updateImageSchema>["body"];

export const getAllImagesAdminSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    productId: z.string().uuid().optional(),
  }),
});

export type GetAllImagesAdminQuery = z.infer<typeof getAllImagesAdminSchema>["query"];
