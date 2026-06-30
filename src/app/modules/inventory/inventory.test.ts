import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { adminToken, userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { inventory, inventoryMovements, productVariants, products } from "../../../db/schema";
import inventoryRoutes from "./inventory.routes";

const app = createTestApp(inventoryRoutes);
const GHOST_ID = "00000000-0000-0000-0000-000000000000";

async function cleanAll() {
  await db.delete(inventoryMovements);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
}

async function seedProduct() {
  const [row] = await db.insert(products).values({ name: "Inv Product", slug: `inv-prod-${Date.now()}`, basePrice: "500", isActive: true }).returning();
  return row!;
}

async function seedVariant(productId: string) {
  const [row] = await db.insert(productVariants).values({ productId, sku: `SKU-INV-${Date.now()}`, price: "500", stock: 0, isActive: true }).returning();
  return row!;
}

async function seedInventory(variantId: string, overrides: Partial<typeof inventory.$inferInsert> = {}) {
  const [row] = await db.insert(inventory).values({
    variantId,
    location: "main",
    quantity: 100,
    reorderPoint: 10,
    reorderQuantity: 50,
    ...overrides,
  }).returning();
  return row!;
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanAll(); });
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

// ─── GET / ────────────────────────────────────────────────────────────────────

describe("GET /inventory (admin)", () => {
  it("returns empty list when no inventory", async () => {
    const res = await request(app).get("/").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns paginated inventory records", async () => {
    const product = await seedProduct();
    const v1 = await seedVariant(product.id);
    const v2 = await seedVariant(product.id);
    await seedInventory(v1.id);
    await seedInventory(v2.id, { location: "warehouse-2" });

    const res = await request(app).get("/?limit=1").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.pagination.total).toBe(2);
  });

  it("filters by variantId", async () => {
    const product = await seedProduct();
    const v1 = await seedVariant(product.id);
    const v2 = await seedVariant(product.id);
    await seedInventory(v1.id);
    await seedInventory(v2.id);

    const res = await request(app).get(`/?variantId=${v1.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].variantId).toBe(v1.id);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(403);
  });

  it("filters by search term (product name)", async () => {
    const p1 = await db.insert(products).values({ name: "Air Force One", slug: `af1-${Date.now()}`, basePrice: "500", isActive: true }).returning().then(r => r[0]!);
    const p2 = await db.insert(products).values({ name: "Chuck Taylor", slug: `ct-${Date.now()}`, basePrice: "400", isActive: true }).returning().then(r => r[0]!);
    const v1 = await seedVariant(p1.id);
    const v2 = await seedVariant(p2.id);
    await seedInventory(v1.id);
    await seedInventory(v2.id);

    const res = await request(app).get("/?search=air").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ─── GET /availability ────────────────────────────────────────────────────────

describe("GET /inventory/availability (public)", () => {
  it("returns quantity for requested variantIds", async () => {
    const product = await seedProduct();
    const v1 = await seedVariant(product.id);
    const v2 = await seedVariant(product.id);
    await seedInventory(v1.id, { quantity: 30 });
    await seedInventory(v2.id, { quantity: 0 });

    const res = await request(app).get(`/availability?variantIds=${v1.id}&variantIds=${v2.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const v1Row = res.body.data.find((r: { variantId: string }) => r.variantId === v1.id);
    expect(v1Row?.quantity).toBe(30);
  });

  it("returns empty array for unknown variantIds", async () => {
    const res = await request(app).get("/availability?variantIds=00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("requires at least one variantId", async () => {
    const res = await request(app).get("/availability");
    expect(res.status).toBe(400);
  });

  it("is public — no auth required", async () => {
    const res = await request(app).get("/availability?variantIds=00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(200); // not 401
  });
});

// ─── GET /low-stock ───────────────────────────────────────────────────────────

describe("GET /inventory/low-stock (admin)", () => {
  it("returns only low-stock records (availableQty < reorderPoint)", async () => {
    const product = await seedProduct();
    const v1 = await seedVariant(product.id);
    const v2 = await seedVariant(product.id);

    await seedInventory(v1.id, { quantity: 5, reorderPoint: 10 });  // low stock
    await seedInventory(v2.id, { quantity: 50, reorderPoint: 10 }); // ok

    const res = await request(app).get("/low-stock").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].variantId).toBe(v1.id);
  });
});

// ─── GET /movements ───────────────────────────────────────────────────────────

describe("GET /inventory/movements (admin)", () => {
  it("returns empty movement log", async () => {
    const res = await request(app).get("/movements").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("filters movements by variantId", async () => {
    const product = await seedProduct();
    const v1 = await seedVariant(product.id);
    const v2 = await seedVariant(product.id);
    const inv = await seedInventory(v1.id);
    await seedInventory(v2.id);

    // Create a movement via adjust endpoint
    await request(app).patch(`/${inv.id}/adjust`).set("Authorization", adminToken).send({
      adjustment: 10, movementType: "restock", reason: "purchase_order",
    });

    const res = await request(app).get(`/movements?variantId=${v1.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].movementType).toBe("restock");
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /inventory/:id (admin)", () => {
  it("returns single inventory record", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const inv = await seedInventory(variant.id);

    const res = await request(app).get(`/${inv.id}`).set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(inv.id);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get(`/${GHOST_ID}`).set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });
});

// ─── PUT / (upsert) ───────────────────────────────────────────────────────────

describe("PUT /inventory (admin)", () => {
  it("creates inventory for a variant", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);

    const res = await request(app)
      .put("/")
      .set("Authorization", adminToken)
      .send({ variantId: variant.id, quantity: 200, reorderPoint: 20, reorderQuantity: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(200);
    expect(res.body.data.variantId).toBe(variant.id);
  });

  it("updates existing inventory (upsert)", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    await seedInventory(variant.id, { quantity: 50, location: "main" });

    const res = await request(app)
      .put("/")
      .set("Authorization", adminToken)
      .send({ variantId: variant.id, quantity: 300, location: "main" });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(300);
  });

  it("returns 404 for unknown variant", async () => {
    const res = await request(app)
      .put("/")
      .set("Authorization", adminToken)
      .send({ variantId: GHOST_ID, quantity: 100 });

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    const res = await request(app).put("/").set("Authorization", userToken).send({ variantId: GHOST_ID, quantity: 10 });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:id/adjust ────────────────────────────────────────────────────────

describe("PATCH /inventory/:id/adjust (admin)", () => {
  it("increases quantity and logs movement", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const inv = await seedInventory(variant.id, { quantity: 50 });

    const res = await request(app)
      .patch(`/${inv.id}/adjust`)
      .set("Authorization", adminToken)
      .send({ adjustment: 20, movementType: "restock", reason: "purchase_order", notes: "PO #12345" });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(70);

    // Verify movement was logged
    const movements = await request(app).get("/movements").set("Authorization", adminToken);
    expect(movements.body.data).toHaveLength(1);
    expect(movements.body.data[0].quantity).toBe(20);
    expect(movements.body.data[0].previousQuantity).toBe(50);
    expect(movements.body.data[0].newQuantity).toBe(70);
  });

  it("decreases quantity and logs movement", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const inv = await seedInventory(variant.id, { quantity: 50 });

    const res = await request(app)
      .patch(`/${inv.id}/adjust`)
      .set("Authorization", adminToken)
      .send({ adjustment: -10, movementType: "adjustment", reason: "manual_adjustment" });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(40);
  });

  it("returns 422 when adjustment would result in negative quantity", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const inv = await seedInventory(variant.id, { quantity: 5 });

    const res = await request(app)
      .patch(`/${inv.id}/adjust`)
      .set("Authorization", adminToken)
      .send({ adjustment: -10, movementType: "adjustment", reason: "manual_adjustment" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 400 for invalid movementType", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const inv = await seedInventory(variant.id);

    const res = await request(app)
      .patch(`/${inv.id}/adjust`)
      .set("Authorization", adminToken)
      .send({ adjustment: 10, movementType: "flying", reason: "purchase_order" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`/${GHOST_ID}/adjust`).send({ adjustment: 1, movementType: "restock", reason: "purchase_order" });
    expect(res.status).toBe(401);
  });
});
