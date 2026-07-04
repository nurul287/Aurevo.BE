import { Router } from "express";
import {
  authenticate,
  optionalAuth,
  requireAdmin,
  validate,
  authLimiter,
} from "../../middlewares";
import {
  createOrderSchema,
  getOrdersSchema,
  updateStatusSchema,
  updatePaymentStatusSchema,
  updateTrackingSchema,
  updateFulfillmentSchema,
  orderIdSchema,
  orderNumberSchema,
} from "./orders.schema";
import {
  createOrder,
  getOrders,
  getOrderById,
  getOrderByNumber,
  cancelOrder,
  updateStatus,
  updatePaymentStatus,
  updateTracking,
  updateFulfillment,
  getOrderStats,
  claimOrders,
} from "./orders.controller";

const router: Router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create an order (auth or guest)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, shippingAddress, items]
 *             properties:
 *               email: { type: string, format: email }
 *               paymentMethod: { type: string, enum: [cash, online], default: cash }
 *               shippingAddress: { type: object }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     variantId: { type: string, format: uuid }
 *                     quantity: { type: integer, minimum: 1 }
 *     responses:
 *       201:
 *         description: Order created, stock reserved
 *       422:
 *         description: Insufficient stock
 */
router.post(
  "/",
  optionalAuth,
  authLimiter,
  validate(createOrderSchema),
  createOrder,
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders (own orders for users, all for admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated order list
 */
router.get("/", authenticate, validate(getOrdersSchema), getOrders);
router.get("/stats", authenticate, requireAdmin, getOrderStats);

/**
 * @swagger
 * /api/orders/by-number/{orderNumber}:
 *   get:
 *     summary: Get order by order number (for guest confirmation pages)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order with items
 */
router.get(
  "/by-number/:orderNumber",
  optionalAuth,
  validate(orderNumberSchema),
  getOrderByNumber,
);

/**
 * @swagger
 * /api/orders/claim:
 *   post:
 *     summary: Claim guest orders on login (match by session, email, and the caller's own saved phone)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId: { type: string }
 *     responses:
 *       200:
 *         description: Number of orders claimed
 */
router.post("/claim", authenticate, claimOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID (own for user, any for admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order with items
 *       403:
 *         description: Access denied
 */
router.get("/:id", optionalAuth, validate(orderIdSchema), getOrderById);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order (user: own pending only; admin: any non-delivered)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order cancelled, stock restored
 *       422:
 *         description: Order cannot be cancelled
 */
router.patch("/:id/cancel", authenticate, validate(orderIdSchema), cancelOrder);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/status",
  authenticate,
  requireAdmin,
  validate(updateStatusSchema),
  updateStatus,
);

/**
 * @swagger
 * /api/orders/{id}/payment:
 *   patch:
 *     summary: Update payment status (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment status updated
 */
router.patch(
  "/:id/payment",
  authenticate,
  requireAdmin,
  validate(updatePaymentStatusSchema),
  updatePaymentStatus,
);

/**
 * @swagger
 * /api/orders/{id}/tracking:
 *   patch:
 *     summary: Update tracking number (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tracking updated
 */
router.patch(
  "/:id/tracking",
  authenticate,
  requireAdmin,
  validate(updateTrackingSchema),
  updateTracking,
);

/**
 * @swagger
 * /api/orders/{id}/fulfillment:
 *   patch:
 *     summary: Update fulfillment status (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fulfillment status updated
 */
router.patch(
  "/:id/fulfillment",
  authenticate,
  requireAdmin,
  validate(updateFulfillmentSchema),
  updateFulfillment,
);

export default router;
