import { z } from "zod";

export const chatMessageSchema = z.object({
  body: z.object({
    message: z
      .string()
      .min(1)
      .max(2000, "Message must be under 2000 characters"),
    sessionId: z.string().uuid(),
  }),
});

export const chatOrderDraftActionSchema = z.object({
  body: z.object({
    draftId: z.string().min(1).max(64),
    sessionId: z.string().uuid(),
  }),
});

const shippingAddressSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  address: z.string().min(1).max(500),
  district: z.string().min(1).max(100),
  upazila: z.string().min(1).max(100),
});

/** Same payload the prepare_order tool accepts — used by e2e and the tool handler. */
export const chatPrepareOrderSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          variantId: z.string().uuid().optional(),
          productSlug: z.string().min(1).max(255).optional(),
          productId: z.string().uuid().optional(),
          size: z.string().min(1).max(50).optional(),
          color: z.string().min(1).max(100).optional(),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .min(1),
    shippingAddress: shippingAddressSchema,
    email: z.string().email().optional().nullable(),
    phone: z.string().min(1).max(50).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>["body"];
export type ChatOrderDraftActionInput = z.infer<
  typeof chatOrderDraftActionSchema
>["body"];
export type ChatPrepareOrderInput = z.infer<
  typeof chatPrepareOrderSchema
>["body"];
