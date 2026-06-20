import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { adminToken, userToken } from "../../../test/helpers";
import { db } from "../../../db";
import { products, categories, brands } from "../../../db/schema";
import productRoutes from "./products.routes";

const app = createTestApp(productRoutes);

async function cleanProducts() {
  // FK-safe order: children before parents
  const { orderItems, orders, cartItems, productVariants } = await import("../../../db/schema");
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(cartItems);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(brands);
}

async function seedCategory(name = "Test Category", slug = "test-category") {
  const [row] = await db.insert(categories).values({ name, slug }).returning();
  return row!;
}

async function seedBrand(name = "Test Brand", slug = "test-brand") {
  const [row] = await db.insert(brands).values({ name, slug }).returning();
  return row!;
}

async function seedProduct(overrides: Partial<typeof products.$inferInsert> = {}) {
  const [row] = await db.insert(products).values({
    name: overrides.name ?? "Test Product",
    slug: overrides.slug ?? "test-product",
    basePrice: overrides.basePrice ?? "999",
    isActive: overrides.isActive ?? true,
    isFeatured: overrides.isFeatured ?? false,
    gender: overrides.gender ?? "unisex",
    ...overrides,
  }).returning();
  return row!;
}

beforeEach(async () => { await cleanProducts(); });
afterAll(async () => { await cleanProducts(); });

// ─── GET / ────────────────────────────────────────────────────────────────────

describe("GET /products", () => {
  it("returns empty list", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.pagination.total).toBe(0);
  });

  it("returns paginated products", async () => {
    await seedProduct({ name: "Product A", slug: "product-a" });
    await seedProduct({ name: "Product B", slug: "product-b" });

    const res = await request(app).get("/?limit=1&page=1&sortBy=name&sortOrder=asc");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Product A");
    expect(res.body.meta.pagination.hasNext).toBe(true);
    expect(res.body.meta.pagination.total).toBe(2);
  });

  it("filters by categoryId", async () => {
    const cat = await seedCategory();
    await seedProduct({ slug: "in-cat", categoryId: cat.id });
    await seedProduct({ slug: "no-cat" });

    const res = await request(app).get(`/?categoryId=${cat.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("in-cat");
  });

  it("filters by brandId", async () => {
    const brand = await seedBrand();
    await seedProduct({ slug: "branded", brandId: brand.id });
    await seedProduct({ slug: "unbranded" });

    const res = await request(app).get(`/?brandId=${brand.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("branded");
  });

  it("filters by gender", async () => {
    await seedProduct({ slug: "mens", gender: "men" });
    await seedProduct({ slug: "womens", gender: "women" });

    const res = await request(app).get("/?gender=men");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("mens");
  });

  it("filters by price range", async () => {
    await seedProduct({ slug: "cheap", basePrice: "100" });
    await seedProduct({ slug: "expensive", basePrice: "5000" });

    const res = await request(app).get("/?minPrice=500&maxPrice=6000");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("expensive");
  });

  it("filters by search", async () => {
    await seedProduct({ name: "Air Force One", slug: "air-force-one" });
    await seedProduct({ name: "Classic Blazer", slug: "classic-blazer" });

    const res = await request(app).get("/?search=air");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("air-force-one");
  });

  it("filters by isActive", async () => {
    await seedProduct({ slug: "active", isActive: true });
    await seedProduct({ slug: "inactive", isActive: false });

    const res = await request(app).get("/?isActive=false");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("inactive");
  });

  it("rejects invalid gender enum", async () => {
    const res = await request(app).get("/?gender=kids");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── GET /featured ────────────────────────────────────────────────────────────

describe("GET /products/featured", () => {
  it("returns only featured active products", async () => {
    await seedProduct({ slug: "featured", isFeatured: true, isActive: true });
    await seedProduct({ slug: "not-featured", isFeatured: false });
    await seedProduct({ slug: "featured-inactive", isFeatured: true, isActive: false });

    const res = await request(app).get("/featured");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("featured");
  });
});

// ─── GET /by-slug/:slug ───────────────────────────────────────────────────────

describe("GET /products/by-slug/:slug", () => {
  it("returns product with variants and images", async () => {
    await seedProduct({ slug: "my-product" });
    const res = await request(app).get("/by-slug/my-product");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("my-product");
    expect(Array.isArray(res.body.data.variants)).toBe(true);
    expect(Array.isArray(res.body.data.images)).toBe(true);
  });

  it("returns 404 for unknown slug", async () => {
    const res = await request(app).get("/by-slug/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /products/:id", () => {
  it("returns product with variants and images", async () => {
    const product = await seedProduct();
    const res = await request(app).get(`/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(product.id);
    expect(Array.isArray(res.body.data.variants)).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid uuid", async () => {
    const res = await request(app).get("/bad-id");
    expect(res.status).toBe(400);
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe("POST /products", () => {
  it("creates a product (admin)", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .send({ name: "New Product", slug: "new-product", basePrice: 1499 });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe("new-product");
    expect(res.body.data.id).toBeDefined();
  });

  it("rejects duplicate slug", async () => {
    await seedProduct({ slug: "taken-slug" });

    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .send({ name: "Another", slug: "taken-slug", basePrice: 999 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects negative basePrice", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .send({ name: "Bad Price", slug: "bad-price", basePrice: -100 });

    expect(res.status).toBe(400);
  });

  it("returns 401 with no auth", async () => {
    const res = await request(app).post("/").send({ name: "X", slug: "x", basePrice: 100 });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .send({ name: "X", slug: "x", basePrice: 100 });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:id ───────────────────────────────────────────────────────────────

describe("PATCH /products/:id", () => {
  it("updates a product (admin)", async () => {
    const product = await seedProduct();

    const res = await request(app)
      .patch(`/${product.id}`)
      .set("Authorization", adminToken)
      .send({ name: "Updated Product", isFeatured: true });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Product");
    expect(res.body.data.isFeatured).toBe(true);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/00000000-0000-0000-0000-000000000000")
      .set("Authorization", adminToken)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });

  it("rejects slug conflict on update", async () => {
    const p1 = await seedProduct({ name: "P1", slug: "p-1" });
    await seedProduct({ name: "P2", slug: "p-2" });

    const res = await request(app)
      .patch(`/${p1.id}`)
      .set("Authorization", adminToken)
      .send({ slug: "p-2" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const res = await request(app).patch(`/${product.id}`).send({ name: "X" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe("DELETE /products/:id", () => {
  it("deletes a product (admin)", async () => {
    const product = await seedProduct();

    const res = await request(app)
      .delete(`/${product.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);

    const check = await request(app).get(`/${product.id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete("/00000000-0000-0000-0000-000000000000")
      .set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const res = await request(app).delete(`/${product.id}`);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /bulk/status ───────────────────────────────────────────────────────

describe("PATCH /products/bulk/status", () => {
  it("bulk deactivates products (admin)", async () => {
    const p1 = await seedProduct({ slug: "bulk-1", isActive: true });
    const p2 = await seedProduct({ slug: "bulk-2", isActive: true });

    const res = await request(app)
      .patch("/bulk/status")
      .set("Authorization", adminToken)
      .send({ ids: [p1.id, p2.id], isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    // Verify they're inactive
    const list = await request(app).get("/?isActive=false");
    expect(list.body.meta.pagination.total).toBe(2);
  });

  it("rejects empty ids array", async () => {
    const res = await request(app)
      .patch("/bulk/status")
      .set("Authorization", adminToken)
      .send({ ids: [], isActive: false });

    expect(res.status).toBe(400);
  });

  it("returns 401 with no auth", async () => {
    const res = await request(app)
      .patch("/bulk/status")
      .send({ ids: ["00000000-0000-0000-0000-000000000000"], isActive: false });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /bulk/delete ──────────────────────────────────────────────────────

describe("DELETE /products/bulk/delete", () => {
  it("bulk deletes products (admin)", async () => {
    const p1 = await seedProduct({ slug: "del-1" });
    const p2 = await seedProduct({ slug: "del-2" });

    const res = await request(app)
      .delete("/bulk/delete")
      .set("Authorization", adminToken)
      .send({ ids: [p1.id, p2.id] });

    expect(res.status).toBe(200);

    const list = await request(app).get("/");
    expect(list.body.meta.pagination.total).toBe(0);
  });

  it("returns 401 with no auth", async () => {
    const res = await request(app)
      .delete("/bulk/delete")
      .send({ ids: ["00000000-0000-0000-0000-000000000000"] });
    expect(res.status).toBe(401);
  });
});
