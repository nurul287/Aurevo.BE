import { Router } from "express";
import { authenticate, publicLimiter, validate } from "../../middlewares";
import {
  addItem,
  clearWishlist,
  getWishlist,
  removeByProductId,
  removeItem,
} from "./wishlist.controller";
import {
  addWishlistItemSchema,
  wishlistItemParamsSchema,
  wishlistProductParamsSchema,
} from "./wishlist.schema";

const router: Router = Router();

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get the authenticated user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist items with product details and item count
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, getWishlist);

/**
 * @swagger
 * /api/wishlist/items:
 *   post:
 *     summary: Add a product to the wishlist (idempotent)
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Item added (or existing item returned if already wishlisted)
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       422:
 *         description: Product is not available
 */
router.post(
  "/items",
  authenticate,
  publicLimiter,
  validate(addWishlistItemSchema),
  addItem,
);

/**
 * @swagger
 * /api/wishlist/items/{id}:
 *   delete:
 *     summary: Remove a wishlist item by row id
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wishlist item not found
 */
router.delete(
  "/items/:id",
  authenticate,
  validate(wishlistItemParamsSchema),
  removeItem,
);

/**
 * @swagger
 * /api/wishlist/products/{productId}:
 *   delete:
 *     summary: Remove a product from the wishlist by product id
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wishlist item not found
 */
router.delete(
  "/products/:productId",
  authenticate,
  validate(wishlistProductParamsSchema),
  removeByProductId,
);

/**
 * @swagger
 * /api/wishlist:
 *   delete:
 *     summary: Clear the entire wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist cleared
 *       401:
 *         description: Unauthorized
 */
router.delete("/", authenticate, clearWishlist);

export default router;
