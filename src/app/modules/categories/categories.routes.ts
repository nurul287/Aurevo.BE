import { Router } from "express";
import multer from "multer";
import {
  authenticate,
  publicLimiter,
  requireAdmin,
  strictLimiter,
  uploadLimiter,
  validate,
} from "../../middlewares";


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
import {
  createCategory,
  deleteCategoryImage,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  uploadCategoryImage,
} from "./categories.controller";
import {
  categoryIdSchema,
  createCategorySchema,
  getCategoriesSchema,
  updateCategorySchema,
} from "./categories.schema";

const router: Router = Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List categories
 *     tags: [Categories]
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
 *         name: parentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, sortOrder, createdAt], default: sortOrder }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Paginated list of categories
 */
router.get("/", publicLimiter, validate(getCategoriesSchema), getCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 */
router.get("/:id", publicLimiter, validate(categoryIdSchema), getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category (admin)
 *     tags: [Categories]
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
 *               parentId: { type: string, format: uuid }
 *               sortOrder: { type: integer, default: 0 }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Category created
 *       409:
 *         description: Slug already taken
 */
router.post(
  "/",
  authenticate,
  requireAdmin,
  uploadLimiter,
  upload.single("image"),
  createCategory,
);

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a category (admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 */
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  uploadLimiter,
  upload.single("image"),
  updateCategory,
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 *       422:
 *         description: Category has products — cannot delete
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validate(categoryIdSchema),
  deleteCategory,
);

router.post(
  "/:id/image",
  authenticate,
  requireAdmin,
  uploadLimiter,
  upload.single("image"),
  uploadCategoryImage,
);

router.delete(
  "/:id/image",
  authenticate,
  requireAdmin,
  deleteCategoryImage,
);

export default router;
