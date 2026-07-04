import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { userToken, MOCK_USER, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { cartItems, products, productVariants, guestSessions, inventory } from "../../../db/schema";
import cartRoutes from "./cart.routes";

const app = createTestApp(cartRoutes);

async function cleanAll() {
  await db.delete(cartItems);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(guestSessions);
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanAll(); });
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

async function seedProduct() {
  const [row] = await db.insert(products).values({ name: "Cart Product", slug: `cart-prod-${Date.now()}`, basePrice: "1999", isActive: true }).returning();
  return row!;
}

async function seedVariant(productId: string, stock = 50) {
  const [row] = await db.insert(productVariants).values({
    productId,
    sku: `SKU-CART-${Date.now()}`,
    price: "1999",
    stock,
    isActive: true,
  }).returning();
  // Seed inventory table — cart service checks stock from here
  await db.insert(inventory).values({ variantId: row!.id, quantity: stock, reservedQuantity: 0 });
  return row!;
}

async function seedGuestSession() {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const [row] = await db.insert(guestSessions).values({ expiresAt }).returning();
  return row!;
}

// ─── POST /session ────────────────────────────────────────────────────────────

describe("POST /cart/session", () => {
  it("creates a guest session", async () => {
    const res = await request(app).post("/session");
    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBeDefined();
  });
});

// ─── GET / ────────────────────────────────────────────────────────────────────

describe("GET /cart", () => {
  it("returns empty cart for auth user with no items", async () => {
    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.itemCount).toBe(0);
  });

  it("returns empty cart for guest with no items", async () => {
    const session = await seedGuestSession();
    const res = await request(app).get("/").set("X-Guest-Session", session.id);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it("returns empty cart with no identity", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it("returns auth user cart with items and total", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    await db.insert(cartItems).values({ userId: MOCK_USER.id, variantId: variant.id, quantity: 2, price: "1999" });

    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(1);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(parseFloat(res.body.data.total)).toBeCloseTo(3998, 0);
  });
});

// ─── POST /items ──────────────────────────────────────────────────────────────

describe("POST /cart/items", () => {
  it("adds item to auth user cart", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);

    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ variantId: variant.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(2);
  });

  it("adds item to guest cart", async () => {
    const session = await seedGuestSession();
    const product = await seedProduct();
    const variant = await seedVariant(product.id);

    const res = await request(app)
      .post("/items")
      .set("X-Guest-Session", session.id)
      .send({ variantId: variant.id, quantity: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBe(session.id);
  });

  it("increments quantity if variant already in cart", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 20);

    await request(app).post("/items").set("Authorization", userToken).send({ variantId: variant.id, quantity: 2 });
    const res = await request(app).post("/items").set("Authorization", userToken).send({ variantId: variant.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(5);
  });

  it("returns 422 when stock is insufficient", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 2);

    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ variantId: variant.id, quantity: 5 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 422 for inactive variant", async () => {
    const product = await seedProduct();
    const [variant] = await db.insert(productVariants).values({
      productId: product.id, sku: `INV-${Date.now()}`, price: "999", stock: 10, isActive: false,
    }).returning();

    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ variantId: variant!.id, quantity: 1 });

    expect(res.status).toBe(422);
  });

  it("returns 401 with no auth or guest session", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const res = await request(app).post("/items").send({ variantId: variant.id, quantity: 1 });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid variantId", async () => {
    const res = await request(app).post("/items").set("Authorization", userToken).send({ variantId: "not-uuid", quantity: 1 });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /items/:id ─────────────────────────────────────────────────────────

describe("PATCH /cart/items/:id", () => {
  it("updates item quantity (auth user)", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 20);
    const [item] = await db.insert(cartItems).values({ userId: MOCK_USER.id, variantId: variant.id, quantity: 1, price: "1999" }).returning();

    const res = await request(app)
      .patch(`/items/${item!.id}`)
      .set("Authorization", userToken)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(5);
  });

  it("returns 404 for item belonging to different user", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const session = await seedGuestSession();
    const [item] = await db.insert(cartItems).values({ sessionId: session.id, variantId: variant.id, quantity: 1, price: "1999" }).returning();

    // Auth user tries to update guest's item
    const res = await request(app).patch(`/items/${item!.id}`).set("Authorization", userToken).send({ quantity: 2 });
    expect(res.status).toBe(404);
  });

  it("returns 422 if new quantity exceeds stock", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 3);
    const [item] = await db.insert(cartItems).values({ userId: MOCK_USER.id, variantId: variant.id, quantity: 1, price: "1999" }).returning();

    const res = await request(app).patch(`/items/${item!.id}`).set("Authorization", userToken).send({ quantity: 10 });
    expect(res.status).toBe(422);
  });
});

// ─── DELETE /items/:id ────────────────────────────────────────────────────────

describe("DELETE /cart/items/:id", () => {
  it("removes item from auth user cart", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const [item] = await db.insert(cartItems).values({ userId: MOCK_USER.id, variantId: variant.id, quantity: 1, price: "1999" }).returning();

    const res = await request(app).delete(`/items/${item!.id}`).set("Authorization", userToken);
    expect(res.status).toBe(200);

    const cart = await request(app).get("/").set("Authorization", userToken);
    expect(cart.body.data.itemCount).toBe(0);
  });

  it("returns 404 for unknown item", async () => {
    const res = await request(app).delete("/items/00000000-0000-0000-0000-000000000000").set("Authorization", userToken);
    expect(res.status).toBe(404);
  });
});

// ─── DELETE / ─────────────────────────────────────────────────────────────────

describe("DELETE /cart", () => {
  it("clears auth user cart", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    await db.insert(cartItems).values({ userId: MOCK_USER.id, variantId: variant.id, quantity: 2, price: "1999" });

    const res = await request(app).delete("/").set("Authorization", userToken);
    expect(res.status).toBe(200);

    const cart = await request(app).get("/").set("Authorization", userToken);
    expect(cart.body.data.itemCount).toBe(0);
  });
});

// ─── POST /migrate ────────────────────────────────────────────────────────────

describe("POST /cart/migrate", () => {
  it("migrates guest cart items to auth user", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 20);
    const session = await seedGuestSession();

    // Add 2 items to guest cart
    await db.insert(cartItems).values({ sessionId: session.id, variantId: variant.id, quantity: 2, price: "1999" });

    const res = await request(app)
      .post("/migrate")
      .set("Authorization", userToken)
      .send({ guestSessionId: session.id });

    expect(res.status).toBe(200);
    expect(res.body.data.migrated).toBe(1);

    // Auth user cart should now have the item
    const cart = await request(app).get("/").set("Authorization", userToken);
    expect(cart.body.data.itemCount).toBe(1);
    expect(cart.body.data.items[0].quantity).toBe(2);

    // Guest cart should be empty
    const guestCart = await request(app).get("/").set("X-Guest-Session", session.id);
    expect(guestCart.body.data.itemCount).toBe(0);
  });

  it("merges quantities when user already has same variant", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 20);
    const session = await seedGuestSession();

    // User has 1 in their cart
    await db.insert(cartItems).values({ userId: MOCK_USER.id, variantId: variant.id, quantity: 1, price: "1999" });
    // Guest has 2
    await db.insert(cartItems).values({ sessionId: session.id, variantId: variant.id, quantity: 2, price: "1999" });

    await request(app).post("/migrate").set("Authorization", userToken).send({ guestSessionId: session.id });

    const cart = await request(app).get("/").set("Authorization", userToken);
    expect(cart.body.data.items[0].quantity).toBe(3);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/migrate").send({ guestSessionId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(401);
  });

  it("returns 200 with migrated: 0 when guest cart is empty", async () => {
    const session = await seedGuestSession();
    const res = await request(app).post("/migrate").set("Authorization", userToken).send({ guestSessionId: session.id });
    expect(res.status).toBe(200);
    expect(res.body.data.migrated).toBe(0);
  });
});
