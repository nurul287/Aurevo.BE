import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { adminToken, userToken, MOCK_USER, MOCK_ADMIN_USER, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { orders, orderItems, products, productVariants, inventory, profiles, productReviews, inventoryMovements } from "../../../db/schema";
import orderRoutes from "./orders.routes";

const app = createTestApp(orderRoutes);

const GHOST_ID = "00000000-0000-0000-0000-000000000000";

const TEST_ADDRESS = {
  name: "Test User",
  phone: "01700000000",
  address: "123 Test Street",
  district: "Dhaka",
  upazila: "Dhanmondi",
};

async function cleanAll() {
  await db.delete(productReviews);
  await db.delete(inventoryMovements);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
}

async function seedProduct(slug = `order-prod-${Date.now()}`) {
  const [row] = await db.insert(products).values({ name: "Order Product", slug, basePrice: "2000", isActive: true }).returning();
  return row!;
}

async function seedVariant(productId: string, stock = 20) {
  const [row] = await db.insert(productVariants).values({
    productId, sku: `SKU-ORD-${Date.now()}`, price: "2000", stock, reservedStock: 0, isActive: true,
  }).returning();
  // Seed inventory table — orders service checks stock from here
  await db.insert(inventory).values({ variantId: row!.id, quantity: stock, reservedQuantity: 0 });
  return row!;
}

async function seedOrder(overrides: Partial<typeof orders.$inferInsert> = {}) {
  const [row] = await db.insert(orders).values({
    orderNumber: `ORD-TEST-${Date.now()}`,
    subtotal: "2000",
    totalAmount: "2000",
    billingAddress: TEST_ADDRESS,
    shippingAddress: TEST_ADDRESS,
    email: "test@example.com",
    paymentMethod: "cash",
    ...overrides,
  }).returning();
  return row!;
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanAll(); });
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

// ─── POST / ───────────────────────────────────────────────────────────────────

describe("POST /orders", () => {
  it("creates an order as auth user, reduces stock", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 10);

    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .send({
        email: "user@example.com",
        paymentMethod: "cash",
        shippingAddress: TEST_ADDRESS,
        items: [{ variantId: variant.id, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toMatch(/^ORD-/);
    expect(res.body.data.userId).toBe(MOCK_USER.id);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.totalAmount).toBe("4000.00");

    // Stock should be reduced — inventory is source of truth, productVariants.stock kept in sync
    const [pv] = await db.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, variant.id));
    expect(pv!.stock).toBe(8);
    const [inv] = await db.select({ quantity: inventory.quantity, reservedQuantity: inventory.reservedQuantity }).from(inventory).where(eq(inventory.variantId, variant.id));
    expect(inv!.quantity).toBe(8);
    // A sale is recorded solely as a quantity decrement — reserving on top of
    // it would double-count the sold units in availability calculations.
    expect(inv!.reservedQuantity).toBe(0);
  });

  it("creates a guest order (no auth)", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);

    const res = await request(app)
      .post("/")
      .send({
        email: "guest@example.com",
        shippingAddress: TEST_ADDRESS,
        items: [{ variantId: variant.id, quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBeNull();
  });

  it("returns 422 when stock is insufficient", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 1);

    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .send({ email: "u@e.com", shippingAddress: TEST_ADDRESS, items: [{ variantId: variant.id, quantity: 5 }] });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 404 for unknown variant", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .send({ email: "u@e.com", shippingAddress: TEST_ADDRESS, items: [{ variantId: GHOST_ID, quantity: 1 }] });

    expect(res.status).toBe(404);
  });

  it("returns 400 when items array is empty", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .send({ email: "u@e.com", shippingAddress: TEST_ADDRESS, items: [] });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const res = await request(app)
      .post("/")
      .send({ email: "not-an-email", shippingAddress: TEST_ADDRESS, items: [{ variantId: variant.id, quantity: 1 }] });

    expect(res.status).toBe(400);
  });
});

// ─── GET / ────────────────────────────────────────────────────────────────────

describe("GET /orders", () => {
  it("returns user's own orders only", async () => {
    await seedOrder({ userId: MOCK_USER.id });
    await seedOrder({ userId: MOCK_ADMIN_USER.id });

    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].userId).toBe(MOCK_USER.id);
  });

  it("admin sees all orders", async () => {
    await seedOrder({ userId: MOCK_USER.id });
    await seedOrder({ userId: MOCK_ADMIN_USER.id });
    await seedOrder(); // guest order

    const res = await request(app).get("/").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination.total).toBe(3);
  });

  it("admin can filter by status", async () => {
    await seedOrder({ status: "pending" });
    await seedOrder({ status: "shipped" });

    const res = await request(app).get("/?status=shipped").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("shipped");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(401);
  });
});

// ─── GET /by-number/:orderNumber ──────────────────────────────────────────────

describe("GET /orders/by-number/:orderNumber", () => {
  it("returns order by number with items", async () => {
    const order = await seedOrder({ orderNumber: "ORD-FINDME-001" });
    const res = await request(app).get("/by-number/ORD-FINDME-001");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(order.id);
  });

  it("returns 404 for unknown order number", async () => {
    const res = await request(app).get("/by-number/ORD-NOTEXIST");
    expect(res.status).toBe(404);
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /orders/:id", () => {
  it("user can view own order", async () => {
    const order = await seedOrder({ userId: MOCK_USER.id });
    const res = await request(app).get(`/${order.id}`).set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(order.id);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("user cannot view another user's order", async () => {
    const order = await seedOrder({ userId: MOCK_ADMIN_USER.id });
    const res = await request(app).get(`/${order.id}`).set("Authorization", userToken);
    expect(res.status).toBe(403);
  });

  it("admin can view any order", async () => {
    const order = await seedOrder({ userId: MOCK_USER.id });
    const res = await request(app).get(`/${order.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get(`/${GHOST_ID}`).set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /:id/cancel ────────────────────────────────────────────────────────

describe("PATCH /orders/:id/cancel", () => {
  it("user can cancel own pending order and stock is restored", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 10);

    // Create order via API so stock is correctly reserved
    const created = await request(app).post("/").set("Authorization", userToken).send({
      email: "u@e.com", shippingAddress: TEST_ADDRESS, items: [{ variantId: variant.id, quantity: 3 }],
    });
    const orderId = created.body.data.id;

    const res = await request(app).patch(`/${orderId}/cancel`).set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");

    // Stock should be restored
    const [v] = await db.select({ stock: productVariants.stock }).from(productVariants);
    expect(v!.stock).toBe(10);
  });

  it("user cannot cancel already-cancelled order", async () => {
    const order = await seedOrder({ userId: MOCK_USER.id, status: "cancelled" });
    const res = await request(app).patch(`/${order.id}/cancel`).set("Authorization", userToken);
    expect(res.status).toBe(422);
  });

  it("user cannot cancel shipped order", async () => {
    const order = await seedOrder({ userId: MOCK_USER.id, status: "shipped" });
    const res = await request(app).patch(`/${order.id}/cancel`).set("Authorization", userToken);
    expect(res.status).toBe(422);
  });

  it("user cannot cancel another user's order", async () => {
    const order = await seedOrder({ userId: MOCK_ADMIN_USER.id });
    const res = await request(app).patch(`/${order.id}/cancel`).set("Authorization", userToken);
    expect(res.status).toBe(403);
  });

  it("admin can cancel any order", async () => {
    const order = await seedOrder({ userId: MOCK_USER.id, status: "confirmed" });
    const res = await request(app).patch(`/${order.id}/cancel`).set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
  });
});

// ─── DELETE /orders/:id ─────────────────────────────────────────────────────────

describe("DELETE /orders/:id (admin)", () => {
  it("admin deletes an order and its items cascade", async () => {
    const order = await seedOrder({ status: "cancelled" });
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 5);
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      variantId: variant.id,
      productName: "Test Product",
      quantity: 1,
      unitPrice: "2000",
      totalPrice: "2000",
    });

    const res = await request(app).delete(`/${order.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(200);

    const [check] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, order.id));
    expect(check).toBeUndefined();
    const remainingItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(remainingItems).toHaveLength(0);
  });

  it("returns 422 when the order has a review attached", async () => {
    const order = await seedOrder({ userId: MOCK_USER.id, status: "delivered" });
    const product = await seedProduct();
    await db.insert(productReviews).values({
      productId: product.id,
      userId: MOCK_USER.id,
      orderId: order.id,
      rating: 5,
    });

    const res = await request(app).delete(`/${order.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");

    const [check] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, order.id));
    expect(check).toBeDefined();
  });

  it("returns 422 when the order has an inventory movement record attached", async () => {
    const order = await seedOrder();
    const product = await seedProduct();
    const variant = await seedVariant(product.id, 5);
    await db.insert(inventoryMovements).values({
      variantId: variant.id,
      movementType: "sale",
      reason: "customer_order",
      quantity: -1,
      previousQuantity: 5,
      newQuantity: 4,
      orderId: order.id,
    });

    const res = await request(app).delete(`/${order.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 404 for unknown order", async () => {
    const res = await request(app).delete(`/${GHOST_ID}`).set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    const order = await seedOrder();
    const res = await request(app).delete(`/${order.id}`).set("Authorization", userToken);
    expect(res.status).toBe(403);
  });

  it("returns 401 without auth", async () => {
    const order = await seedOrder();
    const res = await request(app).delete(`/${order.id}`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /:id/status ────────────────────────────────────────────────────────

describe("PATCH /orders/:id/status (admin)", () => {
  it("updates order status", async () => {
    const order = await seedOrder();
    const res = await request(app)
      .patch(`/${order.id}/status`)
      .set("Authorization", adminToken)
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("confirmed");
  });

  it("returns 403 for non-admin", async () => {
    const order = await seedOrder();
    const res = await request(app)
      .patch(`/${order.id}/status`)
      .set("Authorization", userToken)
      .send({ status: "confirmed" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status", async () => {
    const order = await seedOrder();
    const res = await request(app)
      .patch(`/${order.id}/status`)
      .set("Authorization", adminToken)
      .send({ status: "flying" });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /:id/payment ───────────────────────────────────────────────────────

describe("PATCH /orders/:id/payment (admin)", () => {
  it("updates payment status", async () => {
    const order = await seedOrder();
    const res = await request(app)
      .patch(`/${order.id}/payment`)
      .set("Authorization", adminToken)
      .send({ paymentStatus: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe("paid");
  });
});

// ─── PATCH /:id/tracking ──────────────────────────────────────────────────────

describe("PATCH /orders/:id/tracking (admin)", () => {
  it("updates tracking number", async () => {
    const order = await seedOrder();
    const res = await request(app)
      .patch(`/${order.id}/tracking`)
      .set("Authorization", adminToken)
      .send({ trackingNumber: "TRACK-123456" });

    expect(res.status).toBe(200);
    expect(res.body.data.trackingNumber).toBe("TRACK-123456");
  });
});

// ─── PATCH /:id/fulfillment ───────────────────────────────────────────────────

describe("PATCH /orders/:id/fulfillment (admin)", () => {
  it("updates fulfillment status", async () => {
    const order = await seedOrder();
    const res = await request(app)
      .patch(`/${order.id}/fulfillment`)
      .set("Authorization", adminToken)
      .send({ fulfillmentStatus: "fulfilled" });

    expect(res.status).toBe(200);
    expect(res.body.data.fulfillmentStatus).toBe("fulfilled");
  });
});

// ─── POST /orders/claim ────────────────────────────────────────────────────────

describe("POST /orders/claim", () => {
  afterEach(async () => {
    await db.update(profiles).set({ phone: null }).where(eq(profiles.id, MOCK_USER.id));
  });

  it("claims a guest order matching the caller's own saved phone", async () => {
    await db.update(profiles).set({ phone: "01711112222" }).where(eq(profiles.id, MOCK_USER.id));
    await seedOrder({ phone: "01711112222" });

    const res = await request(app).post("/claim").set("Authorization", userToken).send({});

    expect(res.status).toBe(200);
    expect(res.body.data.claimed).toBe(1);
  });

  it("does not claim another customer's order using a client-supplied phone", async () => {
    // MOCK_USER has no phone on their profile; the guest order belongs to someone else's number
    await seedOrder({ phone: "01799998888" });

    const res = await request(app)
      .post("/claim")
      .set("Authorization", userToken)
      .send({ phone: "01799998888" }); // attacker-supplied phone must be ignored

    expect(res.status).toBe(200);
    expect(res.body.data.claimed).toBe(0);

    const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.phone, "01799998888"));
    expect(order!.userId).toBeNull();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/claim").send({});
    expect(res.status).toBe(401);
  });
});
