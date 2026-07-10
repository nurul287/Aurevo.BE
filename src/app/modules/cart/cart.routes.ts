import { Router } from "express";
import {
  authenticate,
  cartLimiter,
  optionalAuth,
  publicLimiter,
  validate,
} from "../../middlewares";
import {
  addItem,
  clearCart,
  createGuestSession,
  getCart,
  migrateCart,
  removeItem,
  updateItem,
} from "./cart.controller";
import {
  addItemSchema,
  cartItemParamsSchema,
  migrateCartSchema,
  updateItemSchema,
} from "./cart.schema";

const router: Router = Router();

/**
 * @swagger
 * /api/cart/session:
 *   post:
 *     summary: Create a guest session for cart tracking
 *     tags: [Cart]
 *     responses:
 *       201:
 *         description: Guest session ID created (pass as X-Guest-Session header)
 */
router.post("/session", publicLimiter, createGuestSession);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current cart (auth user or guest)
 *     tags: [Cart]
 *     parameters:
 *       - in: header
 *         name: X-Guest-Session
 *         schema: { type: string, format: uuid }
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart with items, total, and item count
 */
router.get("/", optionalAuth, getCart);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add item to cart (auth or guest)
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variantId, quantity]
 *             properties:
 *               variantId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       201:
 *         description: Item added (or quantity incremented if already in cart)
 *       422:
 *         description: Insufficient stock
 */
router.post(
  "/items",
  optionalAuth,
  cartLimiter,
  validate(addItemSchema),
  addItem,
);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   patch:
 *     summary: Update cart item quantity (auth or guest)
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Quantity updated
 */
router.patch(
  "/items/:id",
  optionalAuth,
  validate(updateItemSchema),
  updateItem,
);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   delete:
 *     summary: Remove item from cart (auth or guest)
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item removed
 */
router.delete(
  "/items/:id",
  optionalAuth,
  validate(cartItemParamsSchema),
  removeItem,
);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear entire cart (auth or guest)
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete("/", optionalAuth, clearCart);

/**
 * @swagger
 * /api/cart/migrate:
 *   post:
 *     summary: Migrate guest cart to authenticated user after login
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [guestSessionId]
 *             properties:
 *               guestSessionId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Number of items migrated
 */
router.post("/migrate", authenticate, validate(migrateCartSchema), migrateCart);

export default router;
