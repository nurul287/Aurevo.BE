import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(50).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    avatarUrl: z.string().url().optional(),
  }).refine(data => Object.keys(data).length > 0, { message: "At least one field is required" }),
});

// Matches the order shippingAddress shape so a saved address can fill the
// checkout form directly; `label` is a display name (Home / Work).
export const createAddressSchema = z.object({
  body: z.object({
    type: z.enum(["billing", "shipping"]).default("shipping"),
    isDefault: z.boolean().default(false),
    label: z.string().max(50).optional(),
    name: z.string().min(1).max(255),
    phone: z.string().min(1).max(50),
    address: z.string().min(1).max(500),
    district: z.string().min(1).max(100),
    upazila: z.string().min(1).max(100),
  }),
});

export const updateAddressSchema = z.object({
  body: z.object({
    type: z.enum(["billing", "shipping"]).optional(),
    isDefault: z.boolean().optional(),
    label: z.string().max(50).optional().nullable(),
    name: z.string().min(1).max(255).optional(),
    phone: z.string().min(1).max(50).optional(),
    address: z.string().min(1).max(500).optional(),
    district: z.string().min(1).max(100).optional(),
    upazila: z.string().min(1).max(100).optional(),
  }).refine(data => Object.keys(data).length > 0, { message: "At least one field is required" }),
  params: z.object({ id: z.string().uuid() }),
});

export const addressIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    // Without this, Zod silently strips the field (schemas drop unknown
    // keys by default) and the FE's redirectTo never reaches the service —
    // every reset link then falls back to Supabase's bare site_url instead
    // of /reset-password, stranding the recovery tokens on the homepage.
    redirectTo: z.string().url().optional(),
  }),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const resendConfirmationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    type: z.enum(["signup", "email_change"]).default("signup"),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];
export type CreateAddressInput = z.infer<typeof createAddressSchema>["body"];
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>["body"];
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>["body"];
