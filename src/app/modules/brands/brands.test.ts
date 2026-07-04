import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { cleanBrands, adminToken, userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { brands, products } from "../../../db/schema";
import brandRoutes from "./brands.routes";

const app = createTestApp(brandRoutes);

async function seed(overrides: Partial<typeof brands.$inferInsert> = {}) {
  const [row] = await db.insert(brands).values({
    name: overrides.name ?? "Test Brand",
    slug: overrides.slug ?? "test-brand",
    isActive: overrides.isActive ?? true,
    ...overrides,
  }).returning();
  return row!;
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanBrands(); });
afterAll(async () => { await cleanBrands(); await cleanTestUsers(); });

// ─── GET / ────────────────────────────────────────────────────────────────────

describe("GET /brands", () => {
  it("returns empty list", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.pagination.total).toBe(0);
  });

  it("returns paginated results sorted by name asc", async () => {
    await seed({ name: "Zara", slug: "zara" });
    await seed({ name: "Adidas", slug: "adidas" });

    const res = await request(app).get("/?sortBy=name&sortOrder=asc");
    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe("Adidas");
    expect(res.body.data[1].name).toBe("Zara");
  });

  it("filters by search", async () => {
    await seed({ name: "Nike", slug: "nike" });
    await seed({ name: "Puma", slug: "puma" });

    const res = await request(app).get("/?search=nik");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("nike");
  });

  it("filters by isActive", async () => {
    await seed({ name: "Active Brand", slug: "active-brand", isActive: true });
    await seed({ name: "Inactive Brand", slug: "inactive-brand", isActive: false });

    const res = await request(app).get("/?isActive=true");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("active-brand");
  });

  it("rejects invalid limit", async () => {
    const res = await request(app).get("/?limit=200");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /brands/:id", () => {
  it("returns brand by id", async () => {
    const brand = await seed();
    const res = await request(app).get(`/${brand.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(brand.id);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid uuid", async () => {
    const res = await request(app).get("/not-a-uuid");
    expect(res.status).toBe(400);
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe("POST /brands", () => {
  it("creates a brand via multipart (admin)", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "New Brand")
      .field("slug", "new-brand");

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe("new-brand");
    expect(res.body.data.id).toBeDefined();
  });

  it("creates a brand with optional fields", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "Full Brand")
      .field("slug", "full-brand")
      .field("description", "A full brand")
      .field("websiteUrl", "https://fullbrand.com")
      .field("isActive", "true");

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe("A full brand");
    expect(res.body.data.websiteUrl).toBe("https://fullbrand.com");
  });

  it("rejects duplicate slug", async () => {
    await seed({ slug: "taken" });

    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .field("name", "Another")
      .field("slug", "taken");

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
  });

  it("returns 403 for non-admin", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", userToken)
      .field("name", "X")
      .field("slug", "x");
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:id ───────────────────────────────────────────────────────────────

describe("PATCH /brands/:id", () => {
  it("updates a brand via multipart (admin)", async () => {
    const brand = await seed();

    const res = await request(app)
      .patch(`/${brand.id}`)
      .set("Authorization", adminToken)
      .field("name", "Updated Name")
      .field("websiteUrl", "https://updated.com");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
    expect(res.body.data.websiteUrl).toBe("https://updated.com");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/00000000-0000-0000-0000-000000000000")
      .set("Authorization", adminToken)
      .field("name", "X");
    expect(res.status).toBe(404);
  });

  it("rejects slug conflict on update", async () => {
    const b1 = await seed({ name: "B1", slug: "b-1" });
    await seed({ name: "B2", slug: "b-2" });

    const res = await request(app)
      .patch(`/${b1.id}`)
      .set("Authorization", adminToken)
      .field("slug", "b-2");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 401 with no auth", async () => {
    const brand = await seed();
    const res = await request(app).patch(`/${brand.id}`).field("name", "X");
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe("DELETE /brands/:id", () => {
  it("deletes a brand (admin)", async () => {
    const brand = await seed();

    const res = await request(app)
      .delete(`/${brand.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Brand deleted successfully");

    const check = await request(app).get(`/${brand.id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete("/00000000-0000-0000-0000-000000000000")
      .set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });

  it("returns 422 when brand has products", async () => {
    const brand = await seed();
    await db.insert(products).values({
      name: "Brand Product",
      slug: "brand-product",
      basePrice: "200",
      brandId: brand.id,
    });

    const res = await request(app)
      .delete(`/${brand.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUSINESS_RULE");
  });

  it("returns 401 with no auth", async () => {
    const brand = await seed();
    const res = await request(app).delete(`/${brand.id}`);
    expect(res.status).toBe(401);
  });
});
