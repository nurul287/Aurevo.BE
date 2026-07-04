import { z } from "zod";

export const addItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid().optional(),
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  }),
});

export const updateItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(1).max(100),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const cartItemParamsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const migrateCartSchema = z.object({
  body: z.object({
    // Not a UUID — the FE generates guest session ids as "guest_<ts>_<rand>".
    guestSessionId: z.string().min(1),
  }),
});

export type AddItemInput = z.infer<typeof addItemSchema>["body"];
export type UpdateItemInput = z.infer<typeof updateItemSchema>["body"];
export type MigrateCartInput = z.infer<typeof migrateCartSchema>["body"];
