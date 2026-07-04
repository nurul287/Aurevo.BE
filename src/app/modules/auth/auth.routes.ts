import { Router } from "express";
import multer from "multer";
import { authenticate, authLimiter, uploadLimiter, validate } from "../../middlewares";
import {
  createAddress,
  deleteAddress,
  deleteAvatar,
  forgotPassword,
  getAddresses,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  resendConfirmation,
  updateAddress,
  updatePassword,
  updateProfile,
  uploadAvatar,
} from "./auth.controller";
import {
  addressIdSchema,
  createAddressSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendConfirmationSchema,
  updateAddressSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "./auth.schema";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const router: Router = Router();

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
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/logout", authenticate, logout);
router.post("/refresh", authLimiter, validate(refreshTokenSchema), refreshToken);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/update-password", authenticate, validate(updatePasswordSchema), updatePassword);
router.post("/resend-confirmation", authLimiter, validate(resendConfirmationSchema), resendConfirmation);

router.post("/profile/avatar", authenticate, uploadLimiter, upload.single("avatar"), uploadAvatar);
router.delete("/profile/avatar", authenticate, deleteAvatar);

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
router.patch(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  updateProfile,
);

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
router.post(
  "/addresses",
  authenticate,
  authLimiter,
  validate(createAddressSchema),
  createAddress,
);

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
router.patch(
  "/addresses/:id",
  authenticate,
  validate(updateAddressSchema),
  updateAddress,
);

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
router.delete(
  "/addresses/:id",
  authenticate,
  validate(addressIdSchema),
  deleteAddress,
);

export default router;
