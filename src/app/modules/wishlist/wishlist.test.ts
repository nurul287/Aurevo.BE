import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { products, productVariants, wishlistItems } from "../../../db/schema";
import wishlistRoutes from "./wishlist.routes";

const app = createTestApp(wishlistRoutes);

async function cleanAll() {
  await db.delete(wishlistItems);
  await db.delete(productVariants);
  await db.delete(products);
}

beforeAll(async () => {
  await seedTestUsers();
});
beforeEach(async () => {
  await cleanAll();
});
afterAll(async () => {
  await cleanAll();
  await cleanTestUsers();
});

async function seedProduct(overrides: Partial<{ name: string; slug: string; isActive: boolean }> = {}) {
  const [row] = await db
    .insert(products)
    .values({
      name: overrides.name ?? "Wishlist Product",
      slug: overrides.slug ?? `wish-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      basePrice: "2499",
      isActive: overrides.isActive ?? true,
    })
    .returning();
  return row!;
}

describe("GET /wishlist", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(401);
  });

  it("returns empty wishlist for authenticated user", async () => {
    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.itemCount).toBe(0);
  });

  it("lists wishlisted products newest first", async () => {
    const first = await seedProduct({ slug: `wish-a-${Date.now()}` });
    const second = await seedProduct({ slug: `wish-b-${Date.now()}` });

    await request(app).post("/items").set("Authorization", userToken).send({ productId: first.id });
    await request(app).post("/items").set("Authorization", userToken).send({ productId: second.id });

    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(2);
    expect(res.body.data.items[0].productId).toBe(second.id);
    expect(res.body.data.items[1].productId).toBe(first.id);
    expect(res.body.data.items[0].product).toMatchObject({
      id: second.id,
      name: "Wishlist Product",
    });
    expect(res.body.data.items[0].product.images).toEqual([]);
    expect(res.body.data.items[0].product.variants).toEqual([]);
  });

  it("includes active variants so storefront add-to-cart can resolve sizes", async () => {
    const product = await seedProduct({ slug: `wish-variants-${Date.now()}` });
    await db.insert(productVariants).values({
      productId: product.id,
      sku: `SKU-WISH-${Date.now()}`,
      size: "42",
      price: "2499",
      isActive: true,
    });

    await request(app).post("/items").set("Authorization", userToken).send({ productId: product.id });
    const res = await request(app).get("/").set("Authorization", userToken);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].product.variants).toHaveLength(1);
    expect(res.body.data.items[0].product.variants[0]).toMatchObject({
      size: "42",
      productId: product.id,
    });
  });
});

describe("POST /wishlist/items", () => {
  it("returns 401 without auth", async () => {
    const product = await seedProduct();
    const res = await request(app).post("/items").send({ productId: product.id });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid productId", async () => {
    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("adds a product to the wishlist", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.productId).toBe(product.id);
    expect(res.body.data.product.id).toBe(product.id);
  });

  it("is idempotent when the product is already wishlisted", async () => {
    const product = await seedProduct();
    const first = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: product.id });
    const second = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: product.id });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    const list = await request(app).get("/").set("Authorization", userToken);
    expect(list.body.data.itemCount).toBe(1);
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: "00000000-0000-4000-8000-000000000099" });
    expect(res.status).toBe(404);
  });

  it("returns 422 for inactive product", async () => {
    const product = await seedProduct({ isActive: false, slug: `wish-inactive-${Date.now()}` });
    const res = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: product.id });
    expect(res.status).toBe(422);
  });
});

describe("DELETE /wishlist/items/:id", () => {
  it("removes an item by wishlist row id", async () => {
    const product = await seedProduct();
    const added = await request(app)
      .post("/items")
      .set("Authorization", userToken)
      .send({ productId: product.id });

    const res = await request(app)
      .delete(`/items/${added.body.data.id}`)
      .set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);

    const list = await request(app).get("/").set("Authorization", userToken);
    expect(list.body.data.itemCount).toBe(0);
  });

  it("returns 404 for missing item", async () => {
    const res = await request(app)
      .delete("/items/00000000-0000-4000-8000-000000000099")
      .set("Authorization", userToken);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /wishlist/products/:productId", () => {
  it("removes an item by product id", async () => {
    const product = await seedProduct();
    await request(app).post("/items").set("Authorization", userToken).send({ productId: product.id });

    const res = await request(app)
      .delete(`/products/${product.id}`)
      .set("Authorization", userToken);
    expect(res.status).toBe(200);

    const list = await request(app).get("/").set("Authorization", userToken);
    expect(list.body.data.itemCount).toBe(0);
  });

  it("returns 404 when product is not in wishlist", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .delete(`/products/${product.id}`)
      .set("Authorization", userToken);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /wishlist", () => {
  it("clears the entire wishlist", async () => {
    const a = await seedProduct({ slug: `wish-clear-a-${Date.now()}` });
    const b = await seedProduct({ slug: `wish-clear-b-${Date.now()}` });
    await request(app).post("/items").set("Authorization", userToken).send({ productId: a.id });
    await request(app).post("/items").set("Authorization", userToken).send({ productId: b.id });

    const res = await request(app).delete("/").set("Authorization", userToken);
    expect(res.status).toBe(200);

    const list = await request(app).get("/").set("Authorization", userToken);
    expect(list.body.data.itemCount).toBe(0);
  });
});
