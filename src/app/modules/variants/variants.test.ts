import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { createTestApp } from "../../../test/app";
import { adminToken, userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { products, productVariants, inventory } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { globalErrorHandler } from "../../middlewares/globalErrorHandler";
import variantRoutes from "./variants.routes";

// Variants are nested under /api/products/:productId/variants — replicate the nesting
function createVariantsApp() {
  const app = express();
  app.use(express.json());
  app.use("/:productId/variants", variantRoutes);
  app.use(globalErrorHandler);
  return app;
}

const app = createVariantsApp();

async function cleanAll() {
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
}

async function seedProduct(slug = "variant-test-product") {
  const [row] = await db.insert(products).values({
    name: "Variant Test Product",
    slug,
    basePrice: "1999",
    isActive: true,
  }).returning();
  return row!;
}

async function seedVariant(productId: string, overrides: Partial<typeof productVariants.$inferInsert> = {}) {
  const stock = overrides.stock ?? 10;
  const [row] = await db.insert(productVariants).values({
    productId,
    name: overrides.name ?? "Size M / Black",
    sku: overrides.sku ?? `SKU-${Date.now()}`,
    size: overrides.size ?? "M",
    color: overrides.color ?? "Black",
    price: overrides.price ?? "1999",
    stock,
    isActive: overrides.isActive ?? true,
    ...overrides,
  }).returning();
  // Seed inventory — adjustStock syncs both tables, so both must exist in tests
  await db.insert(inventory).values({ variantId: row!.id, quantity: stock, reservedQuantity: 0 });
  return row!;
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanAll(); });
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

const GHOST_ID = "00000000-0000-0000-0000-000000000000";

// ─── GET /:productId/variants ────────────────────────────────────────────────

describe("GET /products/:productId/variants", () => {
  it("returns all variants for a product", async () => {
    const product = await seedProduct();
    await seedVariant(product.id, { sku: "A1", size: "S", sortOrder: 1 });
    await seedVariant(product.id, { sku: "A2", size: "M", sortOrder: 2 });

    const res = await request(app).get(`/${product.id}/variants`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].size).toBe("S");
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app).get(`/${GHOST_ID}/variants`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid productId uuid", async () => {
    const res = await request(app).get("/not-a-uuid/variants");
    expect(res.status).toBe(400);
  });
});

// ─── GET /:productId/variants/:id ────────────────────────────────────────────

describe("GET /products/:productId/variants/:id", () => {
  it("returns a single variant", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, { sku: "SINGLE-1" });

    const res = await request(app).get(`/${product.id}/variants/${variant.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(variant.id);
    expect(res.body.data.sku).toBe("SINGLE-1");
  });

  it("returns 404 for unknown variant", async () => {
    const product = await seedProduct();
    const res = await request(app).get(`/${product.id}/variants/${GHOST_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 when variant belongs to different product", async () => {
    const p1 = await seedProduct("p-1");
    const p2 = await seedProduct("p-2");
    const variant = await seedVariant(p1.id, { sku: "CROSS-1" });

    const res = await request(app).get(`/${p2.id}/variants/${variant.id}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /:productId/variants ────────────────────────────────────────────────

describe("POST /products/:productId/variants", () => {
  it("creates a variant (admin)", async () => {
    const product = await seedProduct();

    const res = await request(app)
      .post(`/${product.id}/variants`)
      .set("Authorization", adminToken)
      .send({ name: "L / White", size: "L", color: "White", price: 2499, stock: 20 });

    expect(res.status).toBe(201);
    expect(res.body.data.size).toBe("L");
    expect(res.body.data.stock).toBe(20);
  });

  it("creates a variant with SKU", async () => {
    const product = await seedProduct();

    const res = await request(app)
      .post(`/${product.id}/variants`)
      .set("Authorization", adminToken)
      .send({ sku: "UNIQ-SKU-001", size: "XL", stock: 5 });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe("UNIQ-SKU-001");
  });

  it("rejects duplicate SKU", async () => {
    const product = await seedProduct();
    await seedVariant(product.id, { sku: "DUP-SKU" });

    const res = await request(app)
      .post(`/${product.id}/variants`)
      .set("Authorization", adminToken)
      .send({ sku: "DUP-SKU", size: "M" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app)
      .post(`/${GHOST_ID}/variants`)
      .set("Authorization", adminToken)
      .send({ size: "M" });
    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const res = await request(app).post(`/${product.id}/variants`).send({ size: "M" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .post(`/${product.id}/variants`)
      .set("Authorization", userToken)
      .send({ size: "M" });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:productId/variants/:id ──────────────────────────────────────────

describe("PATCH /products/:productId/variants/:id", () => {
  it("updates a variant (admin)", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, { sku: "UPD-1" });

    const res = await request(app)
      .patch(`/${product.id}/variants/${variant.id}`)
      .set("Authorization", adminToken)
      .send({ name: "XL / Red", color: "Red", isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("XL / Red");
    expect(res.body.data.isActive).toBe(false);
  });

  it("rejects SKU conflict on update", async () => {
    const product = await seedProduct();
    const v1 = await seedVariant(product.id, { sku: "V-1" });
    await seedVariant(product.id, { sku: "V-2" });

    const res = await request(app)
      .patch(`/${product.id}/variants/${v1.id}`)
      .set("Authorization", adminToken)
      .send({ sku: "V-2" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown variant", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .patch(`/${product.id}/variants/${GHOST_ID}`)
      .set("Authorization", adminToken)
      .send({ size: "S" });
    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const res = await request(app).patch(`/${product.id}/variants/${variant.id}`).send({ size: "S" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /:productId/variants/:id ─────────────────────────────────────────

describe("DELETE /products/:productId/variants/:id", () => {
  it("deletes a variant (admin)", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);

    const res = await request(app)
      .delete(`/${product.id}/variants/${variant.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);

    const check = await request(app).get(`/${product.id}/variants/${variant.id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown variant", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .delete(`/${product.id}/variants/${GHOST_ID}`)
      .set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const res = await request(app).delete(`/${product.id}/variants/${variant.id}`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /:productId/variants/:id/stock ────────────────────────────────────

describe("PATCH /products/:productId/variants/:id/stock", () => {
  it("increases stock (admin) and syncs inventory table", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, { stock: 10 });

    const res = await request(app)
      .patch(`/${product.id}/variants/${variant.id}/stock`)
      .set("Authorization", adminToken)
      .send({ adjustment: 5, reason: "Restock" });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(15);
    const [inv] = await db.select({ quantity: inventory.quantity }).from(inventory).where(eq(inventory.variantId, variant.id));
    expect(inv!.quantity).toBe(15);
  });

  it("decreases stock (admin) and syncs inventory table", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, { stock: 10 });

    const res = await request(app)
      .patch(`/${product.id}/variants/${variant.id}/stock`)
      .set("Authorization", adminToken)
      .send({ adjustment: -3 });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(7);
    const [inv] = await db.select({ quantity: inventory.quantity }).from(inventory).where(eq(inventory.variantId, variant.id));
    expect(inv!.quantity).toBe(7);
  });

  it("returns 422 when adjustment results in negative stock", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id, { stock: 5 });

    const res = await request(app)
      .patch(`/${product.id}/variants/${variant.id}/stock`)
      .set("Authorization", adminToken)
      .send({ adjustment: -10 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const res = await request(app)
      .patch(`/${product.id}/variants/${variant.id}/stock`)
      .send({ adjustment: 1 });
    expect(res.status).toBe(401);
  });
});
