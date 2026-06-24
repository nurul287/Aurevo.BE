import { z } from "zod";

const addressSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  address: z.string().min(1).max(500),
  district: z.string().min(1).max(100),
  upazila: z.string().min(1).max(100),
});

export const createOrderSchema = z.object({
  body: z.object({
    email: z.string().email().optional().nullable(),
    phone: z.string().min(1).max(50).optional(),
    paymentMethod: z.enum(["cash", "online"]).default("cash"),
    shippingAddress: addressSchema,
    billingAddress: addressSchema.optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(100),
    })).min(1, "At least one item is required"),
  }),
});

export const getOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]).optional(),
    paymentStatus: z.enum(["pending", "paid", "failed", "refunded", "partially_refunded"]).optional(),
    userId: z.string().uuid().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
    internalNotes: z.string().max(1000).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(["pending", "paid", "failed", "refunded", "partially_refunded"]),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const updateTrackingSchema = z.object({
  body: z.object({
    trackingNumber: z.string().min(1).max(255),
    estimatedDeliveryDate: z.string().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const updateFulfillmentSchema = z.object({
  body: z.object({
    fulfillmentStatus: z.enum(["unfulfilled", "partial", "fulfilled"]),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const orderIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const orderNumberSchema = z.object({
  params: z.object({ orderNumber: z.string().min(1) }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>["body"];
export type GetOrdersInput = z.infer<typeof getOrdersSchema>["query"];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>["body"];
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>["body"];
export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>["body"];
export type UpdateFulfillmentInput = z.infer<typeof updateFulfillmentSchema>["body"];
