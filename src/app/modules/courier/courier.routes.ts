import { Router } from "express";
import { authenticate, requireAdmin, validate, trackingLimiter } from "../../middlewares";
import { shipOrderSchema, refreshOrderStatusSchema, trackByCodeSchema, courierWebhookSchema } from "./courier.schema";
import { shipOrder, refreshOrderStatus, trackByCode, getCourierBalance, receiveWebhook } from "./courier.controller";

const router: Router = Router();

/**
 * @swagger
 * /api/courier/orders/{id}/ship:
 *   post:
 *     summary: Book a Steadfast consignment for an order (admin, explicit — commits real money)
 *     tags: [Courier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consignment booked
 */
router.post("/orders/:id/ship", authenticate, requireAdmin, validate(shipOrderSchema), shipOrder);

/**
 * @swagger
 * /api/courier/orders/{id}/refresh:
 *   post:
 *     summary: Re-fetch courier status for a single order (admin)
 *     tags: [Courier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status refreshed
 */
router.post("/orders/:id/refresh", authenticate, requireAdmin, validate(refreshOrderStatusSchema), refreshOrderStatus);

/**
 * @swagger
 * /api/courier/balance:
 *   get:
 *     summary: Get Steadfast account balance (admin)
 *     tags: [Courier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current balance
 */
router.get("/balance", authenticate, requireAdmin, getCourierBalance);

/**
 * @swagger
 * /api/courier/track/{trackingCode}:
 *   get:
 *     summary: Public parcel tracking lookup by tracking code — no PII in the response
 *     tags: [Courier]
 *     responses:
 *       200:
 *         description: Tracking status + event timeline
 */
router.get("/track/:trackingCode", trackingLimiter, validate(trackByCodeSchema), trackByCode);

/**
 * @swagger
 * /api/courier/webhook:
 *   post:
 *     summary: Steadfast delivery status / tracking update webhook (Bearer-token guarded, machine-to-machine)
 *     tags: [Courier]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook received
 *       401:
 *         description: Missing/invalid Bearer token
 */
router.post("/webhook", validate(courierWebhookSchema), receiveWebhook);

export default router;
