import { Router } from "express";
import { authenticate, validate, authLimiter } from "../../middlewares";
import { updateProfileSchema, createAddressSchema, updateAddressSchema, addressIdSchema } from "./auth.schema";
import { getMe, updateProfile, getAddresses, createAddress, updateAddress, deleteAddress } from "./auth.controller";

const router = Router();

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/me", authenticate, getMe);

/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     summary: Update authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.patch("/profile", authenticate, validate(updateProfileSchema), updateProfile);

/**
 * @swagger
 * /api/auth/addresses:
 *   get:
 *     summary: Get all saved addresses for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 */
router.get("/addresses", authenticate, getAddresses);

/**
 * @swagger
 * /api/auth/addresses:
 *   post:
 *     summary: Add a new address
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, addressLine1, city, state, postalCode]
 *     responses:
 *       201:
 *         description: Address created
 */
router.post("/addresses", authenticate, authLimiter, validate(createAddressSchema), createAddress);

/**
 * @swagger
 * /api/auth/addresses/{id}:
 *   patch:
 *     summary: Update a saved address
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address updated
 */
router.patch("/addresses/:id", authenticate, validate(updateAddressSchema), updateAddress);

/**
 * @swagger
 * /api/auth/addresses/{id}:
 *   delete:
 *     summary: Delete a saved address
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address deleted
 */
router.delete("/addresses/:id", authenticate, validate(addressIdSchema), deleteAddress);

export default router;
