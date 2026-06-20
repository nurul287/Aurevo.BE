import { Router } from "express";
import multer from "multer";
import { authenticate, requireAdmin, validate, publicLimiter, uploadLimiter } from "../../middlewares";
import { updateImageSchema, imageParamsSchema, productParamsSchema } from "./images.schema";
import { getImages, getImageById, uploadImage, updateImage, setPrimaryImage, deleteImage } from "./images.controller";

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

/**
 * @swagger
 * /api/products/{productId}/images:
 *   get:
 *     summary: List images for a product
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of images ordered by sortOrder
 */
router.get("/", publicLimiter, validate(productParamsSchema), getImages);

/**
 * @swagger
 * /api/products/{productId}/images/{id}:
 *   get:
 *     summary: Get a single image
 *     tags: [Images]
 *     responses:
 *       200:
 *         description: Image detail
 */
router.get("/:id", publicLimiter, validate(imageParamsSchema), getImageById);

/**
 * @swagger
 * /api/products/{productId}/images:
 *   post:
 *     summary: Upload a product image (admin)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               altText:
 *                 type: string
 *               variantId:
 *                 type: string
 *                 format: uuid
 *               sortOrder:
 *                 type: integer
 *               isPrimary:
 *                 type: string
 *                 enum: [true, false]
 *     responses:
 *       201:
 *         description: Image uploaded and record created
 */
router.post("/", authenticate, requireAdmin, uploadLimiter, upload.single("image"), uploadImage);

/**
 * @swagger
 * /api/products/{productId}/images/{id}:
 *   patch:
 *     summary: Update image metadata (admin)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image updated
 */
router.patch("/:id", authenticate, requireAdmin, validate(updateImageSchema), updateImage);

/**
 * @swagger
 * /api/products/{productId}/images/{id}/primary:
 *   patch:
 *     summary: Set image as primary (admin)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image set as primary, previous primary cleared
 */
router.patch("/:id/primary", authenticate, requireAdmin, validate(imageParamsSchema), setPrimaryImage);

/**
 * @swagger
 * /api/products/{productId}/images/{id}:
 *   delete:
 *     summary: Delete image from storage and DB (admin)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image deleted
 */
router.delete("/:id", authenticate, requireAdmin, validate(imageParamsSchema), deleteImage);

export default router;
