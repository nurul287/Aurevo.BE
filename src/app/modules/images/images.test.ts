import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

vi.mock("../../../lib/storage", () => ({
  uploadFile: vi.fn().mockResolvedValue("http://127.0.0.1:55321/storage/v1/object/public/product-images/test.jpg"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getPublicUrl: vi.fn().mockReturnValue("http://127.0.0.1:55321/storage/v1/object/public/product-images/test.jpg"),
}));
import request from "supertest";
import express from "express";
import { db } from "../../../db";
import { productImages, products } from "../../../db/schema";
import { globalErrorHandler } from "../../middlewares/globalErrorHandler";
import { adminToken, userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import imageRoutes from "./images.routes";

function createImagesApp() {
  const app = express();
  app.use(express.json());
  app.use("/:productId/images", imageRoutes);
  app.use(globalErrorHandler);
  return app;
}

const app = createImagesApp();

const GHOST_ID = "00000000-0000-0000-0000-000000000000";

async function cleanAll() {
  await db.delete(productImages);
  await db.delete(products);
}

async function seedProduct(slug = "img-test-product") {
  const [row] = await db.insert(products).values({
    name: "Image Test Product",
    slug,
    basePrice: "999",
    isActive: true,
  }).returning();
  return row!;
}

async function seedImage(productId: string, overrides: Partial<typeof productImages.$inferInsert> = {}) {
  const [row] = await db.insert(productImages).values({
    productId,
    url: overrides.url ?? "http://127.0.0.1:55321/storage/v1/object/public/product-images/test.jpg",
    altText: overrides.altText ?? "Test image",
    sortOrder: overrides.sortOrder ?? 0,
    isPrimary: overrides.isPrimary ?? false,
    ...overrides,
  }).returning();
  return row!;
}

// Tiny 1x1 white GIF — valid image bytes for testing upload
const TINY_GIF = Buffer.from("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanAll(); });
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

// ─── GET /:productId/images ───────────────────────────────────────────────────

describe("GET /products/:productId/images", () => {
  it("returns empty list for product with no images", async () => {
    const product = await seedProduct();
    const res = await request(app).get(`/${product.id}/images`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns images ordered by sortOrder", async () => {
    const product = await seedProduct();
    await seedImage(product.id, { sortOrder: 2, altText: "Second" });
    await seedImage(product.id, { sortOrder: 1, altText: "First" });

    const res = await request(app).get(`/${product.id}/images`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].altText).toBe("First");
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app).get(`/${GHOST_ID}/images`);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid productId", async () => {
    const res = await request(app).get("/not-a-uuid/images");
    expect(res.status).toBe(400);
  });
});

// ─── GET /:productId/images/:id ───────────────────────────────────────────────

describe("GET /products/:productId/images/:id", () => {
  it("returns a single image", async () => {
    const product = await seedProduct();
    const image = await seedImage(product.id, { altText: "Hero shot" });

    const res = await request(app).get(`/${product.id}/images/${image.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(image.id);
    expect(res.body.data.altText).toBe("Hero shot");
  });

  it("returns 404 for unknown image", async () => {
    const product = await seedProduct();
    const res = await request(app).get(`/${product.id}/images/${GHOST_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 when image belongs to different product", async () => {
    const p1 = await seedProduct("img-p1");
    const p2 = await seedProduct("img-p2");
    const image = await seedImage(p1.id);

    const res = await request(app).get(`/${p2.id}/images/${image.id}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /:productId/images ──────────────────────────────────────────────────

describe("POST /products/:productId/images (upload)", () => {
  it("uploads an image and creates DB record (admin)", async () => {
    const product = await seedProduct();

    const res = await request(app)
      .post(`/${product.id}/images`)
      .set("Authorization", adminToken)
      .attach("image", TINY_GIF, { filename: "test.gif", contentType: "image/gif" })
      .field("altText", "Product hero");

    expect(res.status).toBe(201);
    expect(res.body.data.url).toBeDefined();
    expect(res.body.data.altText).toBe("Product hero");
    expect(res.body.data.isPrimary).toBe(true); // first image auto-becomes primary
  });

  it("second upload does NOT auto-set primary", async () => {
    const product = await seedProduct();
    await seedImage(product.id, { isPrimary: true });

    const res = await request(app)
      .post(`/${product.id}/images`)
      .set("Authorization", adminToken)
      .attach("image", TINY_GIF, { filename: "second.gif", contentType: "image/gif" });

    expect(res.status).toBe(201);
    expect(res.body.data.isPrimary).toBe(false);
  });

  it("returns 400 when no file attached", async () => {
    const product = await seedProduct();

    const res = await request(app)
      .post(`/${product.id}/images`)
      .set("Authorization", adminToken)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app)
      .post(`/${GHOST_ID}/images`)
      .set("Authorization", adminToken)
      .attach("image", TINY_GIF, { filename: "test.gif", contentType: "image/gif" });

    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .post(`/${product.id}/images`)
      .attach("image", TINY_GIF, { filename: "test.gif", contentType: "image/gif" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .post(`/${product.id}/images`)
      .set("Authorization", userToken)
      .attach("image", TINY_GIF, { filename: "test.gif", contentType: "image/gif" });
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /:productId/images/:id ────────────────────────────────────────────

describe("PATCH /products/:productId/images/:id", () => {
  it("updates altText and sortOrder (admin)", async () => {
    const product = await seedProduct();
    const image = await seedImage(product.id);

    const res = await request(app)
      .patch(`/${product.id}/images/${image.id}`)
      .set("Authorization", adminToken)
      .send({ altText: "Updated alt", sortOrder: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.altText).toBe("Updated alt");
    expect(res.body.data.sortOrder).toBe(5);
  });

  it("returns 404 for unknown image", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .patch(`/${product.id}/images/${GHOST_ID}`)
      .set("Authorization", adminToken)
      .send({ altText: "X" });
    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const image = await seedImage(product.id);
    const res = await request(app).patch(`/${product.id}/images/${image.id}`).send({ altText: "X" });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /:productId/images/:id/primary ────────────────────────────────────

describe("PATCH /products/:productId/images/:id/primary", () => {
  it("sets image as primary and clears the old one (admin)", async () => {
    const product = await seedProduct();
    const img1 = await seedImage(product.id, { isPrimary: true });
    const img2 = await seedImage(product.id, { isPrimary: false });

    const res = await request(app)
      .patch(`/${product.id}/images/${img2.id}/primary`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.isPrimary).toBe(true);

    // Old primary should be cleared
    const oldRes = await request(app).get(`/${product.id}/images/${img1.id}`);
    expect(oldRes.body.data.isPrimary).toBe(false);
  });

  it("returns 404 for unknown image", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .patch(`/${product.id}/images/${GHOST_ID}/primary`)
      .set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /:productId/images/:id ───────────────────────────────────────────

describe("DELETE /products/:productId/images/:id", () => {
  it("deletes the image record (admin)", async () => {
    const product = await seedProduct();
    const image = await seedImage(product.id);

    const res = await request(app)
      .delete(`/${product.id}/images/${image.id}`)
      .set("Authorization", adminToken);

    expect(res.status).toBe(200);

    const check = await request(app).get(`/${product.id}/images/${image.id}`);
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown image", async () => {
    const product = await seedProduct();
    const res = await request(app)
      .delete(`/${product.id}/images/${GHOST_ID}`)
      .set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });

  it("returns 401 with no auth", async () => {
    const product = await seedProduct();
    const image = await seedImage(product.id);
    const res = await request(app).delete(`/${product.id}/images/${image.id}`);
    expect(res.status).toBe(401);
  });
});
