import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { cleanCategories, adminToken, userToken } from "../../../test/helpers";
import { db } from "../../../db";
import { categories, products } from "../../../db/schema";
import categoryRoutes from "./categories.routes";

const app = createTestApp(categoryRoutes);

async function seed(overrides: Partial<typeof categories.$inferInsert> = {}) {
  const [row] = await db.insert(categories).values({
    name: overrides.name ?? "Test Category",
    slug: overrides.slug ?? "test-category",
    isActive: overrides.isActive ?? true,
    sortOrder: overrides.sortOrder ?? 0,
    ...overrides,
  }).returning();
  return row!;
}

beforeEach(async () => {
  await cleanCategories();
});

afterAll(async () => {
  await cleanCategories();
});

// ─── GET / ────────────────────────────────────────────────────────────────────

describe("GET /categories", () => {
  it("returns empty list", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.pagination.total).toBe(0);
  });

  it("returns paginated results", async () => {
    await seed({ name: "Alpha", slug: "alpha" });
    await seed({ name: "Beta", slug: "beta" });

    const res = await request(app).get("/?limit=1&page=1&sortBy=name&sortOrder=asc");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Alpha");
    expect(res.body.meta.pagination.hasNext).toBe(true);
    expect(res.body.meta.pagination.hasPrev).toBe(false);
    expect(res.body.meta.pagination.total).toBe(2);
  });

  it("filters by search", async () => {
    await seed({ name: "Sneakers", slug: "sneakers" });
    await seed({ name: "Jackets", slug: "jackets" });

    const res = await request(app).get("/?search=sneak");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("sneakers");
  });

  it("filters by isActive", async () => {
    await seed({ name: "Active Cat", slug: "active-cat", isActive: true });
    await seed({ name: "Inactive Cat", slug: "inactive-cat", isActive: false });

    const res = await request(app).get("/?isActive=false");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("inactive-cat");
  });

  it("rejects page=0 as invalid", async () => {
    const res = await request(app).get("/?page=0");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /categories/:id", () => {
  it("returns category by id", async () => {
    const cat = await seed();
    const res = await request(app).get(`/${cat.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(cat.id);
    expect(res.body.data.name).toBe("Test Category");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid uuid", async () => {
    const res = await request(app).get("/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe("POST /categories", () => {
  it("creates a category via multipart (admin)", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "New Category")
      .field("slug", "new-category")
      .field("sortOrder", "1");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe("new-category");
    expect(res.body.data.id).toBeDefined();
  });

  it("creates a category with optional fields", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "Hoodies")
      .field("slug", "hoodies")
      .field("description", "All hoodies")
      .field("isActive", "false");

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe("All hoodies");
    expect(res.body.data.isActive).toBe(false);
  });

  it("rejects duplicate slug", async () => {
    await seed({ slug: "dupe-slug" });

    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "Another")
      .field("slug", "dupe-slug");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 400 when name or slug missing", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "No Slug");

    expect(res.status).toBe(400);
  });

  it("returns 401 with no auth", async () => {
    const res = await request(app)
      .post("/")
      .field("name", "X")
      .field("slug", "x");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 for non-admin user", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .field("name", "X")
      .field("slug", "x");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

// ─── PATCH /:id ───────────────────────────────────────────────────────────────

describe("PATCH /categories/:id", () => {
  it("updates a category via multipart (admin)", async () => {
    const cat = await seed();

    const res = await request(app)
      .patch(`/${cat.id}`)
      .set("Authorization", adminToken)
      .field("name", "Updated Name");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
    expect(res.body.data.slug).toBe("test-category"); // unchanged
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/00000000-0000-0000-0000-000000000000")
      .set("Authorization", adminToken)
      .field("name", "X");

    expect(res.status).toBe(404);
  });

  it("rejects slug conflict on update", async () => {
    const cat1 = await seed({ name: "Cat1", slug: "cat-1" });
    await seed({ name: "Cat2", slug: "cat-2" });

    const res = await request(app)
      .patch(`/${cat1.id}`)
      .set("Authorization", adminToken)
      .field("slug", "cat-2");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 401 with no auth", async () => {
    const cat = await seed();
    const res = await request(app).patch(`/${cat.id}`).field("name", "X");
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe("DELETE /categories/:id", () => {
  it("deletes a category (admin)", async () => {
    const cat = await seed();

    const res = await request(app)
      .delete(`/${cat.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Category deleted successfully");

    // Confirm it's gone
    const check = await request(app).get(`/${cat.id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete("/00000000-0000-0000-0000-000000000000")
      .set("Authorization", adminToken);

    expect(res.status).toBe(404);
  });

  it("returns 422 when category has products", async () => {
    const cat = await seed();
    await db.insert(products).values({
      name: "Test Product",
      slug: "test-product",
      basePrice: "100",
      categoryId: cat.id,
    });

    const res = await request(app)
      .delete(`/${cat.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 422 when category has sub-categories", async () => {
    const parent = await seed({ name: "Parent", slug: "parent" });
    await seed({ name: "Child", slug: "child", parentId: parent.id });

    const res = await request(app)
      .delete(`/${parent.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
    expect(res.body.error.message).toMatch(/sub-categor/i);
  });

  it("returns 401 with no auth", async () => {
    const cat = await seed();
    const res = await request(app).delete(`/${cat.id}`);
    expect(res.status).toBe(401);
  });
});
