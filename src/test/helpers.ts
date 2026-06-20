import jwt from "jsonwebtoken";
import { db } from "../db";
import { categories, brands, products, productVariants, cartItems, orders, orderItems } from "../db/schema";

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
