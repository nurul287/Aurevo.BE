import { z } from "zod";

export const getInventorySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    lowStock: z.enum(["true", "false"]).optional(),
    location: z.string().optional(),
    variantId: z.string().uuid().optional(),
  }),
});

export const upsertInventorySchema = z.object({
  body: z.object({
    variantId: z.string().uuid(),
    location: z.string().default("main"),
    quantity: z.number().int().min(0),
    reorderPoint: z.number().int().min(0).default(0),
    reorderQuantity: z.number().int().min(0).default(0),
  }),
});

export const adjustInventorySchema = z.object({
  body: z.object({
    adjustment: z.number().int(),
    movementType: z.enum(["restock", "sale", "reserve", "unreserve", "cancel", "return", "adjustment", "damage", "theft", "transfer"]),
    reason: z.enum(["purchase_order", "customer_order", "checkout_reserve", "payment_failed", "order_cancelled", "customer_return", "damaged_goods", "inventory_count", "theft_loss", "location_transfer", "manual_adjustment"]),
    notes: z.string().max(500).optional(),
    costPerUnit: z.number().positive().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const getMovementsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    variantId: z.string().uuid().optional(),
    movementType: z.enum(["restock", "sale", "reserve", "unreserve", "cancel", "return", "adjustment", "damage", "theft", "transfer"]).optional(),
  }),
});

export const inventoryIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type GetInventoryInput = z.infer<typeof getInventorySchema>["query"];
export type UpsertInventoryInput = z.infer<typeof upsertInventorySchema>["body"];
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>["body"];
export type GetMovementsInput = z.infer<typeof getMovementsSchema>["query"];
