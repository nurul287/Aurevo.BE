import jwt from "jsonwebtoken";
import { inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { categories, brands, products, productVariants, cartItems, orders, orderItems, profiles } from "../db/schema";

// Local Supabase Docker JWT secret — same as SUPABASE_JWT_SECRET in .env.local
const TEST_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

export const MOCK_ADMIN_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@test.com",
  role: "admin",
};

export const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "user@test.com",
  role: "user",
};

/** Generate a real Supabase-shaped JWT for use in test requests */
export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: "authenticated",
      app_metadata: { role: user.role },
    },
    TEST_JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export const adminToken = `Bearer ${generateToken(MOCK_ADMIN_USER)}`;
export const userToken = `Bearer ${generateToken(MOCK_USER)}`;

// ─── DB Cleanup Helpers ────────────────────────────────────────────────────

export async function cleanDb(): Promise<void> {
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(cartItems);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(brands);
  await db.delete(categories);
}

export async function cleanCategories(): Promise<void> {
  await db.delete(products);
  await db.delete(categories);
}

export async function cleanBrands(): Promise<void> {
  await db.delete(products);
  await db.delete(brands);
}

const TEST_USER_IDS = [MOCK_ADMIN_USER.id, MOCK_USER.id];

/**
 * Seed minimal user + profile rows for test users.
 * Required for FK-constrained tables like cart_items (user_id → profiles.id → users.id).
 * Call in beforeAll for modules that insert cart items or orders by user_id.
 */
/**
 * Seed auth.users (Supabase auth schema) + profiles for MOCK_ADMIN_USER and MOCK_USER.
 * Required for FK-constrained tables: cart_items / orders (user_id → profiles.id → auth.users.id).
 * Auth users were created once in local Supabase; this idempotently ensures profiles exist.
 */
export async function seedTestUsers(): Promise<void> {
  // Ensure auth.users rows exist (idempotent)
  await db.execute(sql`
    INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, encrypted_password)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'authenticated', 'authenticated', NOW(), NOW(), ''),
      ('00000000-0000-0000-0000-000000000002', 'user@test.com', 'authenticated', 'authenticated', NOW(), NOW(), '')
    ON CONFLICT (id) DO NOTHING
  `);

  await db
    .insert(profiles)
    .values([{ id: MOCK_ADMIN_USER.id }, { id: MOCK_USER.id }])
    .onConflictDoNothing();
}

export async function cleanTestUsers(): Promise<void> {
  await db.delete(cartItems);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(profiles).where(inArray(profiles.id, TEST_USER_IDS));
}
