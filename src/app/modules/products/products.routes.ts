import { Router } from "express";
import {
  authenticate,
  optionalAuth,
  publicLimiter,
  requireAdmin,
  strictLimiter,
  validate,
} from "../../middlewares";
import {
  bulkDelete,
  bulkUpdateStatus,
  createProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductById,
  getProductBySlug,
  getProducts,
  updateProduct,
} from "./products.controller";
import {
  bulkDeleteSchema,
  bulkStatusSchema,
  createProductSchema,
  getProductsSchema,
  productIdSchema,
  updateProductSchema,
} from "./products.schema";

const router: Router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products with filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: brandId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [men, women, unisex] }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, basePrice, createdAt, isFeatured], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated product list
 */
// optionalAuth lets admin requests (with a token) see inactive products;
// anonymous callers are always restricted to active ones in the controller.
router.get("/", publicLimiter, optionalAuth, validate(getProductsSchema), getProducts);

/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 8 }
 *     responses:
 *       200:
 *         description: List of featured products
 */
router.get("/featured", publicLimiter, getFeaturedProducts);

/**
 * @swagger
 * /api/products/by-slug/{slug}:
 *   get:
 *     summary: Get product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product with variants and images
 *       404:
 *         description: Product not found
 */
router.get("/by-slug/:slug", publicLimiter, optionalAuth, getProductBySlug);

/**
 * @swagger
 * /api/products/bulk/status:
 *   patch:
 *     summary: Bulk update product active status (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, isActive]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Products updated
 */
router.patch(
  "/bulk/status",
  authenticate,
  requireAdmin,
  validate(bulkStatusSchema),
  bulkUpdateStatus,
);

/**
 * @swagger
 * /api/products/bulk/delete:
 *   delete:
 *     summary: Bulk delete products (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Products deleted
 */
router.delete(
  "/bulk/delete",
  authenticate,
  requireAdmin,
  validate(bulkDeleteSchema),
  bulkDelete,
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID (with variants and images)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product detail with variants and images
 *       404:
 *         description: Product not found
 */
router.get("/:id", publicLimiter, optionalAuth, validate(productIdSchema), getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Product created
 *       409:
 *         description: Slug or SKU already taken
 */
router.post(
  "/",
  authenticate,
  requireAdmin,
  strictLimiter,
  validate(createProductSchema),
  createProduct,
);

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Update a product (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product updated
 */
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  updateProduct,
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validate(productIdSchema),
  deleteProduct,
);

export default router;
