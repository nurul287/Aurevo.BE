import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { profiles, userAddresses } from "../../../db/schema";
import { NotFoundError, ForbiddenError, AppError } from "../../errors/AppError";
import { supabaseAdmin } from "../../../lib/supabase";
import { uploadFile, deleteFile } from "../../../lib/storage";
import { buildImagePath, deleteImageByUrl, extractStoragePath } from "../../../lib/image-upload";
import type {
  UpdateProfileInput,
  CreateAddressInput,
  UpdateAddressInput,
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  UpdatePasswordInput,
  ResendConfirmationInput,
} from "./auth.schema";

const AVATAR_BUCKET = "avatars";

function mapAuthError(message: string): AppError {
  if (message.includes("Invalid login credentials")) {
    return new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (message.includes("Email not confirmed")) {
    return new AppError(403, "Please confirm your email before logging in", "EMAIL_NOT_CONFIRMED");
  }
  if (message.includes("User already registered")) {
    return new AppError(409, "An account with this email already exists", "EMAIL_ALREADY_EXISTS");
  }
  return new AppError(400, message, "AUTH_ERROR");
}

export async function login(input: LoginInput) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error || !data.session) throw mapAuthError(error?.message ?? "Login failed");
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: data.user,
  };
}

export async function register(input: RegisterInput) {
  const { data, error } = await supabaseAdmin.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName ?? "",
        last_name: input.lastName ?? "",
      },
    },
  });
  if (error) throw mapAuthError(error.message);

  // If email confirmation is disabled, session is returned immediately
  if (data.session) {
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: data.user,
      requiresConfirmation: false,
    };
  }

  return { user: data.user, requiresConfirmation: true };
}


export async function refreshSession(input: RefreshTokenInput) {
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: input.refreshToken,
  });
  if (error || !data.session) throw new AppError(401, "Invalid or expired refresh token", "INVALID_TOKEN");
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: data.user,
  };
}

export async function forgotPassword(input: ForgotPasswordInput, redirectTo?: string) {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(input.email, {
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (error) throw mapAuthError(error.message);
}

export async function updatePassword(userId: string, input: UpdatePasswordInput) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: input.password,
  });
  if (error) throw mapAuthError(error.message);
}

export async function resendConfirmation(input: ResendConfirmationInput) {
  const { error } = await supabaseAdmin.auth.resend({
    email: input.email,
    type: input.type,
  });
  if (error) throw mapAuthError(error.message);
}

export async function uploadAvatar(userId: string, file: Express.Multer.File) {
  const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError(400, "Unsupported image format. Use JPG, PNG, WebP, GIF, or AVIF.", "VALIDATION_ERROR");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new AppError(400, "Avatar must be 2 MB or smaller.", "VALIDATION_ERROR");
  }

  // Remove old avatar if exists
  const [profile] = await db.select({ avatarUrl: profiles.avatarUrl }).from(profiles).where(eq(profiles.id, userId));
  if (profile?.avatarUrl) {
    const oldPath = extractStoragePath(profile.avatarUrl);
    if (oldPath) await deleteFile(AVATAR_BUCKET, oldPath).catch(() => {});
  }

  const storagePath = buildImagePath("avatars", userId, "avatar", file);
  const avatarUrl = await uploadFile(AVATAR_BUCKET, storagePath, file.buffer, file.mimetype);

  const [updated] = await db
    .insert(profiles)
    .values({ id: userId, avatarUrl })
    .onConflictDoUpdate({ target: profiles.id, set: { avatarUrl, updatedAt: new Date().toISOString() } })
    .returning();

  return updated!;
}

export async function deleteAvatar(userId: string) {
  const [profile] = await db.select({ avatarUrl: profiles.avatarUrl }).from(profiles).where(eq(profiles.id, userId));
  if (!profile?.avatarUrl) return;

  const path = extractStoragePath(profile.avatarUrl);
  if (path) await deleteFile(AVATAR_BUCKET, path).catch(() => {});

  await db
    .update(profiles)
    .set({ avatarUrl: null, updatedAt: new Date().toISOString() })
    .where(eq(profiles.id, userId));
}

export async function getMe(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  // Return profile if exists, or minimal stub
  return profile ?? { id: userId };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  // Upsert: create profile if first time
  const [existing] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId));

  if (!existing) {
    const [created] = await db.insert(profiles).values({ id: userId, ...input }).returning();
    return created!;
  }

  const [updated] = await db
    .update(profiles)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(profiles.id, userId))
    .returning();
  return updated!;
}

export async function getAddresses(userId: string) {
  return db.select().from(userAddresses).where(eq(userAddresses.userId, userId));
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  // If isDefault, clear other defaults of same type
  if (input.isDefault) {
    await db.update(userAddresses).set({ isDefault: false })
      .where(and(eq(userAddresses.userId, userId), eq(userAddresses.type, input.type)));
  }

  const [address] = await db.insert(userAddresses).values({ userId, ...input }).returning();
  return address!;
}

export async function updateAddress(userId: string, id: string, input: UpdateAddressInput) {
  const [address] = await db.select().from(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
  if (!address) throw new NotFoundError("Address");

  if (input.isDefault) {
    const type = input.type ?? address.type ?? "shipping";
    await db.update(userAddresses).set({ isDefault: false }).where(and(eq(userAddresses.userId, userId), eq(userAddresses.type, type)));
  }

  const [updated] = await db.update(userAddresses)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
    .returning();
  return updated!;
}

export async function deleteAddress(userId: string, id: string) {
  const [address] = await db.select({ id: userAddresses.id }).from(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
  if (!address) throw new NotFoundError("Address");
  await db.delete(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
}
