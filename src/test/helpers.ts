import { db } from "../db";
import { categories, brands, products, productVariants, cartItems, orders, orderItems, profiles, users } from "../db/schema";

// Clean tables in FK-safe order (children first)
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

// Minimal valid JWT-shaped token for testing admin routes.
// We bypass real JWT verification in tests by injecting req.user directly
// via the test app helper below — so this is just a placeholder shape.
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
