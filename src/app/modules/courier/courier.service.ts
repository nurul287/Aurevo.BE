import { and, asc, eq, isNotNull, isNull, notInArray } from "drizzle-orm";
import { db } from "../../../db";
import { courierTrackingEvents, orders } from "../../../db/schema";
import { logger } from "../../../lib/logger";
import {
  courierEnabled,
  createConsignment,
  getStatusByConsignmentId,
  normalizeBdPhone,
} from "../../../lib/steadfast";
import { BusinessRuleError, NotFoundError } from "../../errors/AppError";
import { restoreOrderStock } from "../orders/orders.service";

const TERMINAL_ORDER_STATUSES = new Set(["delivered", "cancelled", "refunded"]);
const TERMINAL_COURIER_STATUSES = new Set(["delivered", "cancelled"]);
const POLL_BATCH_LIMIT = 50;

type CourierEffects = {
  orderStatus?: "shipped" | "delivered" | "cancelled";
  fulfillmentStatus?: "unfulfilled" | "partial" | "fulfilled";
  paymentStatus?: "paid";
  restoreStock?: boolean;
};

/**
 * Pure mapping from a raw Steadfast status string to the effects it should
 * have on our order — no I/O, fully unit-testable. Deliberately conservative
 * once an order is already terminal (delivered/cancelled/refunded): nothing
 * here reopens or re-cancels a terminal order, and "cancelled" only restores
 * stock when the order isn't already cancelled (replay-safe).
 */
export function mapCourierStatus(
  rawStatus: string,
  ctx: { currentOrderStatus: string; isCod: boolean; alreadyPaid: boolean },
): CourierEffects {
  const status = rawStatus.trim().toLowerCase();
  const isTerminal = TERMINAL_ORDER_STATUSES.has(ctx.currentOrderStatus);

  if (status === "delivered") {
    if (isTerminal) return {};
    return {
      orderStatus: "delivered",
      fulfillmentStatus: "fulfilled",
      ...(ctx.isCod && !ctx.alreadyPaid ? { paymentStatus: "paid" as const } : {}),
    };
  }

  if (status === "partial_delivered") {
    if (isTerminal) return {};
    return { fulfillmentStatus: "partial" };
  }

  if (status === "cancelled") {
    // Already cancelled — do NOT restore stock again (replay safety).
    if (ctx.currentOrderStatus === "cancelled") return {};
    // Never let a courier "cancelled" undo a delivered/refunded order.
    if (ctx.currentOrderStatus === "delivered" || ctx.currentOrderStatus === "refunded") return {};
    return { orderStatus: "cancelled", restoreStock: true };
  }

  // "*_approval_pending" / "unknown*" states mean Steadfast hasn't finalized
  // the outcome yet — record the raw status but don't drive order state off
  // something that could still flip either way.
  if (status === "unknown" || status.endsWith("_approval_pending")) {
    return {};
  }

  // pending / in_review / hold — actively in transit.
  if (!isTerminal) return { orderStatus: "shipped" };
  return {};
}

/**
 * Records one courier status/tracking event, applying the mapped effects to
 * the order (if a status was given) and appending a deduped timeline row.
 * Shared by the webhook receiver and the reconciliation poll. Returns false
 * only when the order doesn't exist (caller should ack-and-ignore, not error
 * — an unknown invoice from the courier is not our failure).
 */
export async function recordCourierEvent(params: {
  orderId: string;
  status?: string | null;
  message?: string | null;
  eventAt: string;
  rawPayload: unknown;
}): Promise<boolean> {
  const { orderId, status, message, eventAt, rawPayload } = params;

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return false;

    const existing = await tx
      .select({ id: courierTrackingEvents.id })
      .from(courierTrackingEvents)
      .where(
        and(
          eq(courierTrackingEvents.orderId, orderId),
          eq(courierTrackingEvents.eventAt, eventAt),
          status ? eq(courierTrackingEvents.status, status) : isNull(courierTrackingEvents.status),
          message ? eq(courierTrackingEvents.message, message) : isNull(courierTrackingEvents.message),
        ),
      );
    // Exact-replay dedup — a retried webhook with byte-identical event data is a no-op.
    if (existing.length > 0) return true;

    if (status) {
      const effects = mapCourierStatus(status, {
        currentOrderStatus: order.status ?? "pending",
        isCod: order.paymentMethod === "cash",
        alreadyPaid: order.paymentStatus === "paid",
      });

      if (effects.restoreStock) {
        await restoreOrderStock(tx, orderId);
      }

      const updates: Partial<typeof orders.$inferInsert> = {
        courierStatus: status,
        courierStatusUpdatedAt: eventAt,
        updatedAt: new Date().toISOString(),
      };
      if (effects.orderStatus) updates.status = effects.orderStatus;
      if (effects.fulfillmentStatus) updates.fulfillmentStatus = effects.fulfillmentStatus;
      if (effects.paymentStatus) updates.paymentStatus = effects.paymentStatus;

      await tx.update(orders).set(updates).where(eq(orders.id, orderId));
    }

    await tx.insert(courierTrackingEvents).values({
      orderId,
      provider: order.courierProvider ?? "steadfast",
      status: status ?? null,
      message: message ?? null,
      raw: (rawPayload ?? {}) as object,
      eventAt,
    });

    return true;
  });
}

/**
 * Books a real Steadfast consignment for an order — explicit admin action
 * only (never automatic): this commits real COD/delivery-charge money and
 * Steadfast has no cancel-consignment endpoint. Refuses to double-book.
 */
export async function shipOrder(orderId: string) {
  if (!courierEnabled()) {
    throw new BusinessRuleError("Courier integration is not configured");
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new NotFoundError("Order");

  if (order.courierConsignmentId) {
    throw new BusinessRuleError("Order already has a courier consignment booked");
  }
  if (TERMINAL_ORDER_STATUSES.has(order.status ?? "")) {
    throw new BusinessRuleError(`Cannot ship an order with status "${order.status}"`);
  }

  const shippingAddress = order.shippingAddress as { name?: string; phone?: string; address?: string } | null;
  const name = order.shippingName || shippingAddress?.name;
  const phone = order.shippingPhone || shippingAddress?.phone;
  const address = shippingAddress?.address;
  if (!name || !phone || !address) {
    throw new BusinessRuleError("Order is missing recipient name/phone/address required to book a courier");
  }

  const isCod = order.paymentMethod === "cash" && order.paymentStatus !== "paid";
  const codAmount = isCod ? Number(order.totalAmount) : 0;

  const consignment = await createConsignment({
    invoice: order.orderNumber,
    recipient_name: name,
    recipient_phone: normalizeBdPhone(phone),
    recipient_address: address,
    cod_amount: codAmount,
    note: order.notes ?? undefined,
    delivery_type: 0,
  });

  const nowIso = new Date().toISOString();
  const [updated] = await db.transaction(async (tx) => {
    const result = await tx
      .update(orders)
      .set({
        courierProvider: "steadfast",
        courierConsignmentId: consignment.consignment_id,
        trackingNumber: consignment.tracking_code,
        courierStatus: consignment.status,
        courierStatusUpdatedAt: nowIso,
        status: "shipped",
        updatedAt: nowIso,
      })
      .where(eq(orders.id, orderId))
      .returning();

    await tx.insert(courierTrackingEvents).values({
      orderId,
      provider: "steadfast",
      status: consignment.status,
      message: "Consignment created",
      raw: consignment,
      eventAt: nowIso,
    });

    return result;
  });

  return updated!;
}

/** Public tracking lookup by tracking code — no recipient PII in the response. */
export async function getPublicTracking(trackingCode: string) {
  const [order] = await db
    .select({
      id: orders.id,
      trackingNumber: orders.trackingNumber,
      courierProvider: orders.courierProvider,
      courierStatus: orders.courierStatus,
      courierStatusUpdatedAt: orders.courierStatusUpdatedAt,
      orderStatus: orders.status,
      estimatedDeliveryDate: orders.estimatedDeliveryDate,
    })
    .from(orders)
    .where(eq(orders.trackingNumber, trackingCode));

  if (!order) throw new NotFoundError("Tracking code");

  const events = await db
    .select({
      status: courierTrackingEvents.status,
      message: courierTrackingEvents.message,
      eventAt: courierTrackingEvents.eventAt,
    })
    .from(courierTrackingEvents)
    .where(eq(courierTrackingEvents.orderId, order.id))
    .orderBy(asc(courierTrackingEvents.eventAt));

  return {
    trackingCode: order.trackingNumber,
    provider: order.courierProvider,
    courierStatus: order.courierStatus,
    orderStatus: order.orderStatus,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    events,
  };
}

/** Admin manual single-order poll — re-fetches status directly from Steadfast. */
export async function refreshOrderStatus(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new NotFoundError("Order");
  if (!order.courierConsignmentId) {
    throw new BusinessRuleError("Order has no courier consignment to refresh");
  }

  const status = await getStatusByConsignmentId(order.courierConsignmentId);
  await recordCourierEvent({
    orderId,
    status,
    message: null,
    eventAt: new Date().toISOString(),
    rawPayload: { source: "manual-refresh", status },
  });

  const [updated] = await db.select().from(orders).where(eq(orders.id, orderId));
  return updated!;
}

/**
 * Reconciliation poll — catches shipments whose webhook was missed or
 * dropped. Only touches in-flight consignments (courier_status not yet
 * terminal); Railway cron target via POST /internal/courier/poll.
 */
export async function pollActiveShipments(): Promise<{ updatedCount: number }> {
  const inFlight = await db
    .select({ id: orders.id, consignmentId: orders.courierConsignmentId })
    .from(orders)
    .where(
      and(
        isNotNull(orders.courierConsignmentId),
        notInArray(orders.courierStatus, Array.from(TERMINAL_COURIER_STATUSES)),
      ),
    )
    .limit(POLL_BATCH_LIMIT);

  let updatedCount = 0;
  for (const row of inFlight) {
    try {
      const status = await getStatusByConsignmentId(row.consignmentId!);
      const applied = await recordCourierEvent({
        orderId: row.id,
        status,
        message: null,
        eventAt: new Date().toISOString(),
        rawPayload: { source: "poll", status },
      });
      if (applied) updatedCount++;
    } catch (err) {
      logger.error({ err, orderId: row.id }, "courier poll failed for order");
    }
  }

  return { updatedCount };
}
