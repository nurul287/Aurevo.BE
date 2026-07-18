import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "../../config";
import { logger } from "../../../lib/logger";
import { getBalance } from "../../../lib/steadfast";
import { db } from "../../../db";
import { orders } from "../../../db/schema";
import { eq } from "drizzle-orm";
import * as CourierService from "./courier.service";
import type { CourierWebhookBody } from "./courier.schema";

export const shipOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await CourierService.shipOrder(req.params.id!);
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const refreshOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await CourierService.refreshOrderStatus(req.params.id!);
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const trackByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tracking = await CourierService.getPublicTracking(req.params.trackingCode!);
    res.status(200).json({ success: true, data: tracking });
  } catch (err) {
    next(err);
  }
};

export const getCourierBalance = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const balance = await getBalance();
    res.status(200).json({ success: true, data: { balance } });
  } catch (err) {
    next(err);
  }
};

function isValidWebhookBearer(header: string | undefined): boolean {
  if (!config.COURIER_WEBHOOK_TOKEN || !header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(config.COURIER_WEBHOOK_TOKEN);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Steadfast webhook receiver. Fail-closed: rejects if COURIER_WEBHOOK_TOKEN
 * isn't configured or the Bearer token doesn't match (timing-safe compare —
 * this endpoint auto-advances orders including stock-restoring cancellation,
 * so a spoofable check here is a real inventory/financial risk). Any payload
 * that clears auth but doesn't resolve to a known order/consignment is
 * acked 200 and silently ignored, never mutated — Steadfast should stop
 * retrying either way.
 */
export const receiveWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!isValidWebhookBearer(req.headers.authorization)) {
    res.status(401).json({ status: "error", message: "Invalid or missing webhook token" });
    return;
  }

  const body = req.body as CourierWebhookBody;

  try {
    const [order] = await db.select({ id: orders.id, consignmentId: orders.courierConsignmentId }).from(orders).where(eq(orders.orderNumber, body.invoice));

    if (!order || order.consignmentId !== body.consignment_id) {
      logger.warn({ invoice: body.invoice, consignmentId: body.consignment_id }, "courier webhook: no matching order/consignment — ignored");
      res.status(200).json({ status: "success", message: "Webhook received successfully." });
      return;
    }

    const eventAt = body.updated_at ? new Date(body.updated_at).toISOString() : new Date().toISOString();

    await CourierService.recordCourierEvent({
      orderId: order.id,
      status: body.notification_type === "delivery_status" ? body.status : null,
      message: body.tracking_message ?? null,
      eventAt,
      rawPayload: body,
    });

    res.status(200).json({ status: "success", message: "Webhook received successfully." });
  } catch (err) {
    logger.error({ err }, "courier webhook processing failed");
    res.status(500).json({ status: "error", message: "Internal error processing webhook" });
  }
};
