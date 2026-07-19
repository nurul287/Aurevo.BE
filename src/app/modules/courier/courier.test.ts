import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

vi.mock("../../../lib/steadfast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/steadfast")>();
  return {
    ...actual,
    courierEnabled: vi.fn().mockReturnValue(true),
    createConsignment: vi.fn(),
    getStatusByConsignmentId: vi.fn(),
    getStatusByTrackingCode: vi.fn(),
    getBalance: vi.fn(),
  };
});

import request from "supertest";
import { eq } from "drizzle-orm";
import { createTestApp } from "../../../test/app";
import { adminToken, userToken, seedTestUsers, cleanTestUsers } from "../../../test/helpers";
import { db } from "../../../db";
import {
  orders,
  orderItems,
  products,
  productVariants,
  inventory,
  courierTrackingEvents,
} from "../../../db/schema";
import courierRoutes from "./courier.routes";
import { mapCourierStatus } from "./courier.service";
import { config } from "../../config";
import { courierEnabled, createConsignment, getBalance } from "../../../lib/steadfast";
import { UpstreamServiceError } from "../../errors";

const app = createTestApp(courierRoutes);

const TEST_ADDRESS = {
  name: "Test Recipient",
  phone: "+880 1700-000000",
  address: "123 Test Street, Dhanmondi",
  district: "Dhaka",
  upazila: "Dhanmondi",
};

const GHOST_ID = "00000000-0000-0000-0000-000000000000";

async function cleanAll() {
  await db.delete(courierTrackingEvents);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
}

async function seedProductWithVariant(stock = 10) {
  const [product] = await db
    .insert(products)
    .values({ name: "Courier Test Product", slug: `courier-prod-${Date.now()}-${Math.random()}`, basePrice: "1000", isActive: true })
    .returning();
  const [variant] = await db
    .insert(productVariants)
    .values({ productId: product!.id, sku: `SKU-CR-${Date.now()}-${Math.random()}`, price: "1000", stock, reservedStock: 0, isActive: true })
    .returning();
  await db.insert(inventory).values({ variantId: variant!.id, quantity: stock, reservedQuantity: 0 });
  return { product: product!, variant: variant! };
}

async function seedOrder(overrides: Partial<typeof orders.$inferInsert> = {}, withItem?: { variantId: string; quantity: number }) {
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: `ORD-CRTEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subtotal: "1000",
      totalAmount: "1000",
      billingAddress: TEST_ADDRESS,
      shippingAddress: TEST_ADDRESS,
      shippingName: TEST_ADDRESS.name,
      shippingPhone: TEST_ADDRESS.phone,
      paymentMethod: "cash",
      paymentStatus: "pending",
      status: "confirmed",
      ...overrides,
    })
    .returning();

  if (withItem) {
    await db.insert(orderItems).values({
      orderId: order!.id,
      variantId: withItem.variantId,
      productName: "Courier Test Product",
      quantity: withItem.quantity,
      unitPrice: "1000",
      totalPrice: String(1000 * withItem.quantity),
    });
  }

  return order!;
}

beforeAll(async () => {
  await seedTestUsers();
});
beforeEach(async () => {
  await cleanAll();
  vi.clearAllMocks();
  (courierEnabled as ReturnType<typeof vi.fn>).mockReturnValue(true);
});
afterAll(async () => {
  await cleanAll();
  await cleanTestUsers();
});

// ─── mapCourierStatus (pure function) ──────────────────────────────────────

describe("mapCourierStatus", () => {
  const ctx = (overrides: Partial<{ currentOrderStatus: string; isCod: boolean; alreadyPaid: boolean }> = {}) => ({
    currentOrderStatus: "shipped",
    isCod: true,
    alreadyPaid: false,
    ...overrides,
  });

  it("maps delivered → delivered + fulfilled, and marks COD paid", () => {
    const effects = mapCourierStatus("Delivered", ctx());
    expect(effects).toEqual({ orderStatus: "delivered", fulfillmentStatus: "fulfilled", paymentStatus: "paid" });
  });

  it("does not re-mark payment paid when a COD order was already paid", () => {
    const effects = mapCourierStatus("delivered", ctx({ alreadyPaid: true }));
    expect(effects.paymentStatus).toBeUndefined();
  });

  it("does not set paymentStatus for a prepaid (non-COD) order", () => {
    const effects = mapCourierStatus("delivered", ctx({ isCod: false }));
    expect(effects.paymentStatus).toBeUndefined();
  });

  it("does not reopen an already-terminal order on a delivered event", () => {
    expect(mapCourierStatus("delivered", ctx({ currentOrderStatus: "cancelled" }))).toEqual({});
  });

  it("maps partial_delivered → fulfillmentStatus partial only", () => {
    expect(mapCourierStatus("partial_delivered", ctx())).toEqual({ fulfillmentStatus: "partial" });
  });

  it("maps cancelled → cancelled + restoreStock when not already cancelled", () => {
    expect(mapCourierStatus("cancelled", ctx())).toEqual({ orderStatus: "cancelled", restoreStock: true });
  });

  it("does not restore stock again when already cancelled (replay safety)", () => {
    expect(mapCourierStatus("cancelled", ctx({ currentOrderStatus: "cancelled" }))).toEqual({});
  });

  it("never cancels an already-delivered order", () => {
    expect(mapCourierStatus("cancelled", ctx({ currentOrderStatus: "delivered" }))).toEqual({});
  });

  it("records unknown / approval-pending states without changing order status", () => {
    expect(mapCourierStatus("unknown", ctx())).toEqual({});
    expect(mapCourierStatus("delivered_approval_pending", ctx())).toEqual({});
    expect(mapCourierStatus("cancelled_approval_pending", ctx())).toEqual({});
  });

  it("maps in-transit statuses (pending/in_review/hold) to shipped, case-insensitively", () => {
    expect(mapCourierStatus("PENDING", ctx({ currentOrderStatus: "confirmed" }))).toEqual({ orderStatus: "shipped" });
    expect(mapCourierStatus("in_review", ctx({ currentOrderStatus: "confirmed" }))).toEqual({ orderStatus: "shipped" });
    expect(mapCourierStatus("Hold", ctx({ currentOrderStatus: "confirmed" }))).toEqual({ orderStatus: "shipped" });
  });
});

// ─── POST /courier/orders/:id/ship ─────────────────────────────────────────

describe("POST /courier/orders/:id/ship", () => {
  it("books a consignment, stores fields, and marks the order shipped", async () => {
    const { variant } = await seedProductWithVariant();
    const order = await seedOrder({}, { variantId: variant.id, quantity: 1 });

    (createConsignment as ReturnType<typeof vi.fn>).mockResolvedValue({
      consignment_id: 999111,
      invoice: order.orderNumber,
      tracking_code: "TRK-ABC123",
      recipient_name: TEST_ADDRESS.name,
      recipient_phone: "01700000000",
      recipient_address: TEST_ADDRESS.address,
      cod_amount: 1000,
      status: "in_review",
      note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", adminToken);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("shipped");
    expect(res.body.data.courierConsignmentId).toBe(999111);
    expect(res.body.data.trackingNumber).toBe("TRK-ABC123");
    expect(res.body.data.courierStatus).toBe("in_review");

    // Payload sent to Steadfast used the normalized phone + COD amount = total (unpaid cash order)
    expect(createConsignment).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: order.orderNumber,
        recipient_phone: "01700000000",
        cod_amount: 1000,
      }),
    );

    const events = await db.select().from(courierTrackingEvents).where(eq(courierTrackingEvents.orderId, order.id));
    expect(events).toHaveLength(1);
  });

  it("sends cod_amount = 0 for a prepaid order", async () => {
    const order = await seedOrder({ paymentMethod: "online", paymentStatus: "paid" });
    (createConsignment as ReturnType<typeof vi.fn>).mockResolvedValue({
      consignment_id: 999222,
      invoice: order.orderNumber,
      tracking_code: "TRK-PREPAID",
      recipient_name: TEST_ADDRESS.name,
      recipient_phone: "01700000000",
      recipient_address: TEST_ADDRESS.address,
      cod_amount: 0,
      status: "in_review",
      note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(createConsignment).toHaveBeenCalledWith(expect.objectContaining({ cod_amount: 0 }));
  });

  it("rejects double-booking an order that already has a consignment", async () => {
    const order = await seedOrder({ courierProvider: "steadfast", courierConsignmentId: 555 });
    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", adminToken);
    expect(res.status).toBe(422);
    expect(createConsignment).not.toHaveBeenCalled();
  });

  it("surfaces a Steadfast API failure as 502 with the real upstream message, not a generic 500", async () => {
    const order = await seedOrder({});
    (createConsignment as ReturnType<typeof vi.fn>).mockRejectedValue(
      new UpstreamServiceError("Steadfast: Account is not active!"),
    );

    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", adminToken);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("UPSTREAM_ERROR");
    expect(res.body.error.message).toBe("Steadfast: Account is not active!");
  });

  it("refuses to ship a cancelled order", async () => {
    const order = await seedOrder({ status: "cancelled" });
    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", adminToken);
    expect(res.status).toBe(422);
    expect(createConsignment).not.toHaveBeenCalled();
  });

  it("refuses to ship a delivered order", async () => {
    const order = await seedOrder({ status: "delivered" });
    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", adminToken);
    expect(res.status).toBe(422);
  });

  it("requires admin auth", async () => {
    const order = await seedOrder();
    const res = await request(app).post(`/orders/${order.id}/ship`).set("Authorization", userToken);
    expect(res.status).toBe(403);
  });

  it("404s for a non-existent order", async () => {
    const res = await request(app).post(`/orders/${GHOST_ID}/ship`).set("Authorization", adminToken);
    expect(res.status).toBe(404);
  });
});

// ─── GET /courier/balance ───────────────────────────────────────────────────

describe("GET /courier/balance", () => {
  it("returns the account balance for admins", async () => {
    (getBalance as ReturnType<typeof vi.fn>).mockResolvedValue(4200);
    const res = await request(app).get("/balance").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(4200);
  });

  it("rejects non-admins", async () => {
    const res = await request(app).get("/balance").set("Authorization", userToken);
    expect(res.status).toBe(403);
  });
});

// ─── GET /courier/track/:trackingCode ──────────────────────────────────────

describe("GET /courier/track/:trackingCode", () => {
  it("returns status + event timeline with no recipient PII", async () => {
    const order = await seedOrder({ trackingNumber: "TRK-PUBLIC-1", courierProvider: "steadfast", courierStatus: "in_review" });
    await db.insert(courierTrackingEvents).values({
      orderId: order.id,
      provider: "steadfast",
      status: "in_review",
      message: "Consignment created",
      eventAt: new Date().toISOString(),
    });

    const res = await request(app).get("/track/TRK-PUBLIC-1");
    expect(res.status).toBe(200);
    expect(res.body.data.trackingCode).toBe("TRK-PUBLIC-1");
    expect(res.body.data.events).toHaveLength(1);

    const serialized = JSON.stringify(res.body.data);
    expect(serialized).not.toContain(TEST_ADDRESS.address);
    expect(serialized).not.toContain(TEST_ADDRESS.phone);
    expect(res.body.data.recipientName).toBeUndefined();
    expect(res.body.data.recipientPhone).toBeUndefined();
    expect(res.body.data.shippingAddress).toBeUndefined();
  });

  it("404s for an unknown tracking code", async () => {
    const res = await request(app).get("/track/does-not-exist");
    expect(res.status).toBe(404);
  });
});

// ─── POST /courier/webhook ──────────────────────────────────────────────────

describe("POST /courier/webhook", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await request(app).post("/webhook").send({ notification_type: "delivery_status", consignment_id: 1, invoice: "x", status: "delivered" });
    expect(res.status).toBe(401);
  });

  it("rejects a request with the wrong Bearer token", async () => {
    const res = await request(app)
      .post("/webhook")
      .set("Authorization", "Bearer wrong-token")
      .send({ notification_type: "delivery_status", consignment_id: 1, invoice: "x", status: "delivered" });
    expect(res.status).toBe(401);
  });

  it("acks and ignores an unknown invoice without mutating anything", async () => {
    const res = await request(app)
      .post("/webhook")
      .set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`)
      .send({ notification_type: "delivery_status", consignment_id: 1, invoice: "no-such-invoice", status: "delivered" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("acks and ignores a payload whose consignment_id doesn't match the order's booked consignment", async () => {
    const order = await seedOrder({ courierProvider: "steadfast", courierConsignmentId: 111, status: "shipped" });
    const res = await request(app)
      .post("/webhook")
      .set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`)
      .send({ notification_type: "delivery_status", consignment_id: 999999, invoice: order.orderNumber, status: "delivered" });
    expect(res.status).toBe(200);

    const [unchanged] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(unchanged!.status).toBe("shipped");
  });

  it("delivered (COD) → order delivered, fulfilled, and marked paid", async () => {
    const order = await seedOrder({ courierProvider: "steadfast", courierConsignmentId: 222, status: "shipped", paymentMethod: "cash", paymentStatus: "pending" });
    const res = await request(app)
      .post("/webhook")
      .set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`)
      .send({ notification_type: "delivery_status", consignment_id: 222, invoice: order.orderNumber, status: "delivered", cod_amount: 1000, tracking_message: "Delivered to recipient" });
    expect(res.status).toBe(200);

    const [updated] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(updated!.status).toBe("delivered");
    expect(updated!.fulfillmentStatus).toBe("fulfilled");
    expect(updated!.paymentStatus).toBe("paid");
    expect(updated!.courierStatus).toBe("delivered");
  });

  it("cancelled → order cancelled and stock restored; a byte-identical replay does not double-restore", async () => {
    const { variant } = await seedProductWithVariant(10);
    const order = await seedOrder(
      { courierProvider: "steadfast", courierConsignmentId: 333, status: "shipped" },
      { variantId: variant.id, quantity: 3 },
    );
    // Simulate stock already decremented at checkout time.
    await db.update(productVariants).set({ stock: 7 }).where(eq(productVariants.id, variant.id));
    await db.update(inventory).set({ quantity: 7 }).where(eq(inventory.variantId, variant.id));

    const eventTimestamp = "2026-01-01T00:00:00.000Z";
    const payload = { notification_type: "delivery_status" as const, consignment_id: 333, invoice: order.orderNumber, status: "cancelled", updated_at: eventTimestamp };

    const first = await request(app).post("/webhook").set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`).send(payload);
    expect(first.status).toBe(200);

    const [afterFirst] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(afterFirst!.status).toBe("cancelled");
    const [variantAfterFirst] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(variantAfterFirst!.stock).toBe(10);

    // Exact replay (Steadfast retry) — same event, same timestamp.
    const second = await request(app).post("/webhook").set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`).send(payload);
    expect(second.status).toBe(200);

    const [variantAfterSecond] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(variantAfterSecond!.stock).toBe(10); // NOT 13 — no double restore

    const events = await db.select().from(courierTrackingEvents).where(eq(courierTrackingEvents.orderId, order.id));
    expect(events).toHaveLength(1); // deduped, not two rows
  });

  it("partial_delivered → fulfillmentStatus partial, order.status unchanged", async () => {
    const order = await seedOrder({ courierProvider: "steadfast", courierConsignmentId: 444, status: "shipped" });
    await request(app)
      .post("/webhook")
      .set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`)
      .send({ notification_type: "delivery_status", consignment_id: 444, invoice: order.orderNumber, status: "partial_delivered" });

    const [updated] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(updated!.status).toBe("shipped");
    expect(updated!.fulfillmentStatus).toBe("partial");
  });

  it("a tracking_update event (no status) only appends to the timeline", async () => {
    const order = await seedOrder({ courierProvider: "steadfast", courierConsignmentId: 555, status: "shipped", courierStatus: "in_review" });
    const res = await request(app)
      .post("/webhook")
      .set("Authorization", `Bearer ${config.COURIER_WEBHOOK_TOKEN}`)
      .send({ notification_type: "tracking_update", consignment_id: 555, invoice: order.orderNumber, tracking_message: "Package arrived at sorting hub" });
    expect(res.status).toBe(200);

    const [unchanged] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(unchanged!.status).toBe("shipped");
    expect(unchanged!.courierStatus).toBe("in_review"); // untouched — no status in this event type

    const events = await db.select().from(courierTrackingEvents).where(eq(courierTrackingEvents.orderId, order.id));
    expect(events).toHaveLength(1);
    expect(events[0]!.message).toBe("Package arrived at sorting hub");
  });
});
