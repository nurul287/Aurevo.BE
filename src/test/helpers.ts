import { inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { categories, brands, products, productVariants, cartItems, orders, orderItems, profiles } from "../db/schema";
import { supabaseAdmin } from "../lib/supabase";

// Local Supabase Docker only — real Auth users/sessions, never production.
const ADMIN_TEST_EMAIL = "aurevo-test-admin@example.com";
const USER_TEST_EMAIL = "aurevo-test-user@example.com";
const ADMIN_TEST_PASSWORD = "AurevoTestAdmin123!";
const USER_TEST_PASSWORD = "AurevoTestUser123!";

// `id` is populated by seedTestUsers() once the real Auth user exists — every
// test file imports these objects (not copies), so mutating `.id` in place is
// visible everywhere once seeding has run.
export const MOCK_ADMIN_USER = {
  id: "",
  email: ADMIN_TEST_EMAIL,
  role: "admin",
};

export const MOCK_USER = {
  id: "",
  email: USER_TEST_EMAIL,
  role: "user",
};

// Real Supabase session tokens (not hand-signed) — populated by seedTestUsers().
// `export let` bindings are live: importers see the assigned value once the
// awaited beforeAll() that calls seedTestUsers() has completed.
export let adminToken = "";
export let userToken = "";

/** Create the Auth user if missing, returning its id either way. Idempotent across test runs. */
async function ensureAuthUser(email: string, password: string, role: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (!error) return data.user.id;

  const [existing] = await db.execute(sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`);
  if (existing) return (existing as { id: string }).id;
  throw error;
}

let authReady: Promise<void> | null = null;

/** Ensures both test Auth users exist and mints real session tokens for them. */
function ensureTestAuthUsers(): Promise<void> {
  if (!authReady) {
    authReady = (async () => {
      MOCK_ADMIN_USER.id = await ensureAuthUser(ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD, "admin");
      MOCK_USER.id = await ensureAuthUser(USER_TEST_EMAIL, USER_TEST_PASSWORD, "user");

      const adminSignIn = await supabaseAdmin.auth.signInWithPassword({ email: ADMIN_TEST_EMAIL, password: ADMIN_TEST_PASSWORD });
      if (adminSignIn.error || !adminSignIn.data.session) throw adminSignIn.error ?? new Error("admin test sign-in failed");

      const userSignIn = await supabaseAdmin.auth.signInWithPassword({ email: USER_TEST_EMAIL, password: USER_TEST_PASSWORD });
      if (userSignIn.error || !userSignIn.data.session) throw userSignIn.error ?? new Error("user test sign-in failed");

      adminToken = `Bearer ${adminSignIn.data.session.access_token}`;
      userToken = `Bearer ${userSignIn.data.session.access_token}`;
    })();
  }
  return authReady;
}

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

/**
 * Ensures real Supabase Auth users + sessions exist for MOCK_ADMIN_USER/MOCK_USER,
 * and seeds their `profiles` rows. Call in beforeAll for modules that need auth
 * tokens or insert cart items/orders by user_id.
 */
export async function seedTestUsers(): Promise<void> {
  await ensureTestAuthUsers();

  await db
    .insert(profiles)
    .values([{ id: MOCK_ADMIN_USER.id }, { id: MOCK_USER.id }])
    .onConflictDoNothing();
}

export async function cleanTestUsers(): Promise<void> {
  await db.delete(cartItems);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(profiles).where(inArray(profiles.id, [MOCK_ADMIN_USER.id, MOCK_USER.id]));
}
