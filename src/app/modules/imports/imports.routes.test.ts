import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

vi.mock("../../../lib/queue", () => ({
  enqueueImportJob: vi.fn().mockResolvedValue(undefined),
}));

import request from "supertest";
import { db } from "../../../db";
import { importJobs, importRows, brands, categories, products } from "../../../db/schema";
import { createTestApp } from "../../../test/app";
import { adminToken, userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { generateImportTemplate } from "./spreadsheet";
import importAdminRoutes from "./imports-admin.routes";

const app = createTestApp(importAdminRoutes);

async function cleanAll() {
  await db.delete(importRows);
  await db.delete(importJobs);
  await db.delete(products);
  await db.delete(brands);
  await db.delete(categories);
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(cleanAll);
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

const GHOST_ID = "00000000-0000-0000-0000-000000000000";

describe("auth guards", () => {
  it("401s with no token", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(401);
  });

  it("403s for a non-admin user", async () => {
    const res = await request(app).get("/").set("Authorization", userToken);
    expect(res.status).toBe(403);
  });
});

describe("GET /template", () => {
  it("streams a downloadable xlsx template", async () => {
    const res = await request(app).get("/template").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("product-import-template.xlsx");
    expect(Number(res.headers["content-length"])).toBeGreaterThan(0);
  });
});

describe("POST / (upload)", () => {
  it("accepts a valid .xlsx file upload and creates a job", async () => {
    const buffer = generateImportTemplate();

    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .attach("file", buffer, "products.xlsx");

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.rejected).toHaveLength(0);

    const jobs = await db.select().from(importJobs);
    expect(jobs).toHaveLength(1);
  });

  it("accepts a .ndjson file upload with the application/x-ndjson MIME type", async () => {
    const ndjson =
      JSON.stringify({
        source: "scraper",
        externalId: "scraper-1",
        title: "Scraped Product",
        category: "shirt",
        gender: "men",
        basePrice: 999,
        variants: [{ size: "M" }],
      }) + "\n";

    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .attach("file", Buffer.from(ndjson), { filename: "batch.ndjson", contentType: "application/x-ndjson" });

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(1);
  });

  it("accepts a raw JSON array body as a small-batch fallback", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .send([
        {
          source: "manual",
          externalId: "manual-1",
          title: "Manual Product",
          category: "shirt",
          gender: "unisex",
          basePrice: 500,
          variants: [{ size: "M" }],
        },
      ]);

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(1);
  });

  it("surfaces per-item validation errors from a JSON array body without 500ing", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .send([{ source: "manual", externalId: "bad-1", title: "", category: "shirt", gender: "unisex" }]);

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.rejected).toHaveLength(1);
  });

  it("rejects an unsupported file extension", async () => {
    const res = await request(app)
      .post("/")
      .set("Authorization", adminToken)
      .attach("file", Buffer.from("hello"), "products.txt");

    expect(res.status).toBe(400);
  });

  it("403s for a non-admin user attempting an upload", async () => {
    const res = await request(app).post("/").set("Authorization", userToken).send([]);
    expect(res.status).toBe(403);
  });
});

describe("GET / and GET /:jobId", () => {
  it("lists jobs and fetches one by id", async () => {
    const buffer = generateImportTemplate();
    const created = await request(app).post("/").set("Authorization", adminToken).attach("file", buffer, "p.xlsx");
    const jobId = created.body.data.jobId;

    const list = await request(app).get("/").set("Authorization", adminToken);
    expect(list.status).toBe(200);
    expect(list.body.data.some((j: { id: string }) => j.id === jobId)).toBe(true);

    const single = await request(app).get(`/${jobId}`).set("Authorization", adminToken);
    expect(single.status).toBe(200);
    expect(single.body.data.id).toBe(jobId);
  });

  it("404s for an unknown job id", async () => {
    const res = await request(app).get(`/${GHOST_ID}`).set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });
});

describe("GET /:jobId/rows and POST /:jobId/retry", () => {
  it("lists rows for a job and retries failed rows", async () => {
    const buffer = generateImportTemplate();
    const created = await request(app).post("/").set("Authorization", adminToken).attach("file", buffer, "p.xlsx");
    const jobId = created.body.data.jobId;

    const rows = await request(app).get(`/${jobId}/rows`).set("Authorization", adminToken);
    expect(rows.status).toBe(200);
    expect(rows.body.data).toHaveLength(1);

    const retry = await request(app).post(`/${jobId}/retry`).set("Authorization", adminToken);
    expect(retry.status).toBe(200);
    expect(retry.body.data.retried).toBe(0); // nothing failed yet
  });
});
