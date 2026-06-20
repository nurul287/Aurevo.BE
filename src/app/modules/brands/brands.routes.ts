import { Router } from "express";
import { authenticate, requireAdmin, validate, publicLimiter, strictLimiter } from "../../middlewares";
import { createBrandSchema, updateBrandSchema, getBrandsSchema, brandIdSchema } from "./brands.schema";
import { getBrands, getBrandById, createBrand, updateBrand, deleteBrand } from "./brands.controller";

const router = Router();

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: List brands
 *     tags: [Brands]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, createdAt], default: name }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Paginated list of brands
 */
router.get("/", publicLimiter, validate(getBrandsSchema), getBrands);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Brand found
 *       404:
 *         description: Brand not found
 */
router.get("/:id", publicLimiter, validate(brandIdSchema), getBrandById);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create a brand (admin)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               logoUrl: { type: string, format: uri }
 *               websiteUrl: { type: string, format: uri }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Brand created
 *       409:
 *         description: Slug already taken
 */
router.post("/", authenticate, requireAdmin, strictLimiter, validate(createBrandSchema), createBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   patch:
 *     summary: Update a brand (admin)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Brand updated
 *       404:
 *         description: Brand not found
 */
router.patch("/:id", authenticate, requireAdmin, validate(updateBrandSchema), updateBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete a brand (admin)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Brand deleted
 *       404:
 *         description: Brand not found
 *       422:
 *         description: Brand has products — cannot delete
 */
router.delete("/:id", authenticate, requireAdmin, validate(brandIdSchema), deleteBrand);

export default router;
