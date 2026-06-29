import { Router } from "express";
import { authenticate, requireAdmin, validate } from "../../middlewares";
import {
  adjustInventory,
  getInventory,
  getInventoryById,
  getLowStockAlerts,
  getMovements,
  getVariantAvailability,
  upsertInventory,
} from "./inventory.controller";
import {
  adjustInventorySchema,
  getInventorySchema,
  getMovementsSchema,
  inventoryIdSchema,
  upsertInventorySchema,
} from "./inventory.schema";

const router: Router = Router();

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: List inventory records (admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lowStock
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: variantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated inventory list
 */
router.get(
  "/",
  authenticate,
  requireAdmin,
  validate(getInventorySchema),
  getInventory,
);

// Public endpoint — returns availability for given variant IDs (used by product pages and checkout)
router.get("/availability", getVariantAvailability);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Get all variants where available qty ≤ reorder point (admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low-stock inventory records
 */
router.get("/low-stock", authenticate, requireAdmin, getLowStockAlerts);

/**
 * @swagger
 * /api/inventory/movements:
 *   get:
 *     summary: Audit log of all stock movements (admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: variantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: movementType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated movement audit log
 */
router.get(
  "/movements",
  authenticate,
  requireAdmin,
  validate(getMovementsSchema),
  getMovements,
);

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get inventory record by ID (admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory record
 */
router.get(
  "/:id",
  authenticate,
  requireAdmin,
  validate(inventoryIdSchema),
  getInventoryById,
);

/**
 * @swagger
 * /api/inventory:
 *   put:
 *     summary: Create or update inventory for a variant+location (admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variantId, quantity]
 *             properties:
 *               variantId: { type: string, format: uuid }
 *               location: { type: string, default: main }
 *               quantity: { type: integer, minimum: 0 }
 *               reorderPoint: { type: integer, minimum: 0 }
 *               reorderQuantity: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Inventory created or updated
 */
router.put(
  "/",
  authenticate,
  requireAdmin,
  validate(upsertInventorySchema),
  upsertInventory,
);

/**
 * @swagger
 * /api/inventory/{id}/adjust:
 *   patch:
 *     summary: Adjust inventory quantity and log movement (admin)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [adjustment, movementType, reason]
 *             properties:
 *               adjustment: { type: integer, description: "Positive = add, negative = reduce" }
 *               movementType: { type: string }
 *               reason: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Inventory adjusted, movement logged
 *       422:
 *         description: Adjustment would result in negative inventory
 */
router.patch(
  "/:id/adjust",
  authenticate,
  requireAdmin,
  validate(adjustInventorySchema),
  adjustInventory,
);

export default router;
