import { z } from "zod";

export const addWishlistItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
  }),
});

export const wishlistItemParamsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const wishlistProductParamsSchema = z.object({
  params: z.object({ productId: z.string().uuid() }),
});

export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>["body"];
