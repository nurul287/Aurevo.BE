import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import { userToken, adminToken, MOCK_USER, MOCK_ADMIN_USER, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import { profiles, userAddresses } from "../../../db/schema";
import { eq } from "drizzle-orm";
import authRoutes from "./auth.routes";

const app = createTestApp(authRoutes);
const GHOST_ID = "00000000-0000-0000-0000-000000000000";

const TEST_ADDRESS = {
  label: "Home", name: "Test User", phone: "01700000000",
  address: "123 Main St", district: "Dhaka", upazila: "Dhanmondi",
};

async function cleanAll() {
  await db.delete(userAddresses);
  await db.delete(profiles).where(eq(profiles.id, MOCK_USER.id));
}

beforeAll(async () => { await seedTestUsers(); });
beforeEach(async () => { await cleanAll(); });
afterAll(async () => { await cleanAll(); await cleanTestUsers(); });

// ─── GET /me ──────────────────────────────────────────────────────────────────

describe("GET /auth/me", () => {
  it("returns profile for authenticated user", async () => {
    // Seed a profile
    await db.insert(profiles).values({ id: MOCK_USER.id, firstName: "John" });

    const res = await request(app).get("/me").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(MOCK_USER.id);
    expect(res.body.data.firstName).toBe("John");
  });

  it("returns minimal stub when no profile exists yet", async () => {
    const res = await request(app).get("/me").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(MOCK_USER.id);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /profile ───────────────────────────────────────────────────────────

describe("PATCH /auth/profile", () => {
  it("creates profile on first update (upsert)", async () => {
    const res = await request(app)
      .patch("/profile")
      .set("Authorization", userToken)
      .send({ firstName: "Jane", lastName: "Doe", phone: "01700000000" });

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe("Jane");
    expect(res.body.data.lastName).toBe("Doe");
  });

  it("updates existing profile", async () => {
    await db.insert(profiles).values({ id: MOCK_USER.id, firstName: "Old" });

    const res = await request(app)
      .patch("/profile")
      .set("Authorization", userToken)
      .send({ firstName: "New" });

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe("New");
  });

  it("returns 400 for empty body", async () => {
    const res = await request(app).patch("/profile").set("Authorization", userToken).send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid gender", async () => {
    const res = await request(app).patch("/profile").set("Authorization", userToken).send({ gender: "robot" });
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/profile").send({ firstName: "X" });
    expect(res.status).toBe(401);
  });
});

// ─── GET /addresses ───────────────────────────────────────────────────────────

describe("GET /auth/addresses", () => {
  it("returns empty list when no addresses", async () => {
    const res = await request(app).get("/addresses").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns user's addresses", async () => {
    await db.insert(profiles).values({ id: MOCK_USER.id });
    await db.insert(userAddresses).values({ userId: MOCK_USER.id, ...TEST_ADDRESS });

    const res = await request(app).get("/addresses").set("Authorization", userToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].district).toBe("Dhaka");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/addresses");
    expect(res.status).toBe(401);
  });
});

// ─── POST /addresses ──────────────────────────────────────────────────────────

describe("POST /auth/addresses", () => {
  it("creates an address", async () => {
    await db.insert(profiles).values({ id: MOCK_USER.id });

    const res = await request(app)
      .post("/addresses")
      .set("Authorization", userToken)
      .send({ ...TEST_ADDRESS, type: "shipping" });

    expect(res.status).toBe(201);
    expect(res.body.data.district).toBe("Dhaka");
    expect(res.body.data.userId).toBe(MOCK_USER.id);
  });

  it("sets new default and clears old default", async () => {
    await db.insert(profiles).values({ id: MOCK_USER.id });
    await db.insert(userAddresses).values({ userId: MOCK_USER.id, ...TEST_ADDRESS, isDefault: true, type: "shipping" });

    const res = await request(app)
      .post("/addresses")
      .set("Authorization", userToken)
      .send({ ...TEST_ADDRESS, name: "New User", type: "shipping", isDefault: true });

    expect(res.status).toBe(201);
    expect(res.body.data.isDefault).toBe(true);

    // Old address should no longer be default
    const all = await request(app).get("/addresses").set("Authorization", userToken);
    const defaults = all.body.data.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(defaults).toHaveLength(1);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/addresses")
      .set("Authorization", userToken)
      .send({ name: "Only" }); // missing many required fields
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/addresses").send(TEST_ADDRESS);
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /addresses/:id ─────────────────────────────────────────────────────

describe("PATCH /auth/addresses/:id", () => {
  it("updates an address", async () => {
    await db.insert(profiles).values({ id: MOCK_USER.id });
    const [addr] = await db.insert(userAddresses).values({ userId: MOCK_USER.id, ...TEST_ADDRESS }).returning();

    const res = await request(app)
      .patch(`/addresses/${addr!.id}`)
      .set("Authorization", userToken)
      .send({ district: "Chittagong" });

    expect(res.status).toBe(200);
    expect(res.body.data.district).toBe("Chittagong");
  });

  it("returns 404 for address belonging to another user", async () => {
    // Create address under adminUser
    await db.insert(userAddresses).values({ userId: MOCK_ADMIN_USER.id, ...TEST_ADDRESS });
    const [addrs] = await db.select().from(userAddresses);

    const res = await request(app).patch(`/addresses/${addrs!.id}`).set("Authorization", userToken).send({ district: "X" });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`/addresses/${GHOST_ID}`).send({ district: "X" });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /addresses/:id ────────────────────────────────────────────────────

describe("DELETE /auth/addresses/:id", () => {
  it("deletes user's own address", async () => {
    await db.insert(profiles).values({ id: MOCK_USER.id });
    const [addr] = await db.insert(userAddresses).values({ userId: MOCK_USER.id, ...TEST_ADDRESS }).returning();

    const res = await request(app).delete(`/addresses/${addr!.id}`).set("Authorization", userToken);
    expect(res.status).toBe(200);

    const all = await request(app).get("/addresses").set("Authorization", userToken);
    expect(all.body.data).toHaveLength(0);
  });

  it("returns 404 for unknown address", async () => {
    const res = await request(app).delete(`/addresses/${GHOST_ID}`).set("Authorization", userToken);
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete(`/addresses/${GHOST_ID}`);
    expect(res.status).toBe(401);
  });
});
