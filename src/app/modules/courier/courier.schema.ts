import { z } from "zod";

export const shipOrderSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const refreshOrderStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const trackByCodeSchema = z.object({
  params: z.object({ trackingCode: z.string().min(1).max(100) }),
});

// Steadfast's own docs only document these two notification_type values.
// Extra/unknown fields are ignored rather than rejected, since the courier
// controls this payload shape and can add fields without warning.
const deliveryStatusWebhookSchema = z.object({
  notification_type: z.literal("delivery_status"),
  consignment_id: z.number(),
  invoice: z.string(),
  cod_amount: z.number().optional(),
  status: z.string(),
  delivery_charge: z.number().optional(),
  tracking_message: z.string().optional(),
  updated_at: z.string().optional(),
});

const trackingUpdateWebhookSchema = z.object({
  notification_type: z.literal("tracking_update"),
  consignment_id: z.number(),
  invoice: z.string(),
  tracking_message: z.string().optional(),
  updated_at: z.string().optional(),
});

export const courierWebhookSchema = z.object({
  body: z.discriminatedUnion("notification_type", [
    deliveryStatusWebhookSchema,
    trackingUpdateWebhookSchema,
  ]),
});

export type CourierWebhookBody = z.infer<typeof courierWebhookSchema>["body"];
