import { Router } from "express";
import { authenticate, requireAdmin, validate, publicLimiter, strictLimiter } from "../../middlewares";
import {
  createVariantSchema, updateVariantSchema, adjustStockSchema,
  variantParamsSchema, productParamsSchema,
} from "./variants.schema";
import {
  getVariants, getVariantById, createVariant, updateVariant, deleteVariant, adjustStock,
} from "./variants.controller";

// Mounted at /api/products/:productId/variants — productId comes from mergeParams
const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/products/{productId}/variants:
 *   get:
 *     summary: List all variants for a product
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of variants ordered by sortOrder
 *       404:
 *         description: Product not found
 */
router.get("/", publicLimiter, validate(productParamsSchema), getVariants);

/**
 * @swagger
 * /api/products/{productId}/variants/{id}:
 *   get:
 *     summary: Get a single variant
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Variant detail
 *       404:
 *         description: Product or variant not found
 */
router.get("/:id", publicLimiter, validate(variantParamsSchema), getVariantById);

/**
 * @swagger
 * /api/products/{productId}/variants:
 *   post:
 *     summary: Create a variant (admin)
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Variant created
 *       409:
 *         description: SKU already taken
 */
router.post("/", authenticate, requireAdmin, strictLimiter, validate(createVariantSchema), createVariant);

/**
 * @swagger
 * /api/products/{productId}/variants/{id}:
 *   patch:
 *     summary: Update a variant (admin)
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Variant updated
 */
router.patch("/:id", authenticate, requireAdmin, validate(updateVariantSchema), updateVariant);

/**
 * @swagger
 * /api/products/{productId}/variants/{id}:
 *   delete:
 *     summary: Delete a variant (admin)
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Variant deleted
 */
router.delete("/:id", authenticate, requireAdmin, validate(variantParamsSchema), deleteVariant);

/**
 * @swagger
 * /api/products/{productId}/variants/{id}/stock:
 *   patch:
 *     summary: Adjust variant stock (admin)
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [adjustment]
 *             properties:
 *               adjustment:
 *                 type: integer
 *                 description: Positive to add stock, negative to reduce
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted
 *       422:
 *         description: Adjustment would result in negative stock
 */
router.patch("/:id/stock", authenticate, requireAdmin, validate(adjustStockSchema), adjustStock);

export default router;
