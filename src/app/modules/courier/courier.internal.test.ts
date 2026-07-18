import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/steadfast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/steadfast")>();
  return {
    ...actual,
    courierEnabled: vi.fn().mockReturnValue(true),
    getStatusByConsignmentId: vi.fn().mockResolvedValue("delivered"),
  };
});

import request from "supertest";
import { eq } from "drizzle-orm";
import { createTestApp } from "../../../test/app";
import { db } from "../../../db";
import { orders, orderItems, products, productVariants, inventory, courierTrackingEvents } from "../../../db/schema";
import courierInternalRoutes from "./courier.internal.routes";
import { config } from "../../config";
import { getStatusByConsignmentId } from "../../../lib/steadfast";

const app = createTestApp(courierInternalRoutes);

const TEST_ADDRESS = {
  name: "Test Recipient",
  phone: "01700000000",
  address: "123 Test Street",
  district: "Dhaka",
  upazila: "Dhanmondi",
};

async function cleanAll() {
  await db.delete(courierTrackingEvents);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
}

async function seedShippedOrder(overrides: Partial<typeof orders.$inferInsert> = {}) {
  const [row] = await db
    .insert(orders)
    .values({
      orderNumber: `ORD-POLLTEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subtotal: "1000",
      totalAmount: "1000",
      billingAddress: TEST_ADDRESS,
      shippingAddress: TEST_ADDRESS,
      paymentMethod: "cash",
      status: "shipped",
      courierProvider: "steadfast",
      courierConsignmentId: Math.floor(Math.random() * 1_000_000_000),
      courierStatus: "in_review",
      courierStatusUpdatedAt: new Date().toISOString(),
      ...overrides,
    })
    .returning();
  return row!;
}

beforeEach(async () => {
  await cleanAll();
  vi.clearAllMocks();
  (getStatusByConsignmentId as ReturnType<typeof vi.fn>).mockResolvedValue("delivered");
});

describe("POST /internal/courier/poll", () => {
  it("rejects a request with no internal task token", async () => {
    const res = await request(app).post("/poll");
    expect(res.status).toBe(401);
  });

  it("rejects a request with the wrong token", async () => {
    const res = await request(app).post("/poll").set("x-internal-task-token", "wrong-token");
    expect(res.status).toBe(401);
  });

  it("updates in-flight shipments and skips already-terminal ones", async () => {
    const inFlight = await seedShippedOrder();
    await seedShippedOrder({ status: "delivered", courierStatus: "delivered" });

    const res = await request(app).post("/poll").set("x-internal-task-token", config.INTERNAL_TASK_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.updatedCount).toBe(1);
    expect(getStatusByConsignmentId).toHaveBeenCalledTimes(1);
    expect(getStatusByConsignmentId).toHaveBeenCalledWith(inFlight.courierConsignmentId);

    const [updated] = await db.select().from(orders).where(eq(orders.id, inFlight.id));
    expect(updated!.status).toBe("delivered");
    expect(updated!.fulfillmentStatus).toBe("fulfilled");
  });

  it("does nothing when there are no in-flight shipments", async () => {
    const res = await request(app).post("/poll").set("x-internal-task-token", config.INTERNAL_TASK_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data.updatedCount).toBe(0);
    expect(getStatusByConsignmentId).not.toHaveBeenCalled();
  });

  it("continues past a per-order failure and still reports the successful updates", async () => {
    const failing = await seedShippedOrder();
    const ok = await seedShippedOrder();

    (getStatusByConsignmentId as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
      if (id === failing.courierConsignmentId) throw new Error("Steadfast timeout");
      return "delivered";
    });

    const res = await request(app).post("/poll").set("x-internal-task-token", config.INTERNAL_TASK_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data.updatedCount).toBe(1);

    const [okOrder] = await db.select().from(orders).where(eq(orders.id, ok.id));
    expect(okOrder!.status).toBe("delivered");
  });
});
