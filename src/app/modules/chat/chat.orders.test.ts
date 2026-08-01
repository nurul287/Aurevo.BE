import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import {
  cleanTestUsers,
  MOCK_USER,
  seedTestUsers,
  userToken,
} from "../../../test/helpers";
import { db } from "../../../db";
import {
  inventory,
  inventoryMovements,
  orderItems,
  orders,
  productReviews,
  products,
  productVariants,
} from "../../../db/schema";
import { clearOrderDraftsForTests } from "./chat.order-draft";
import chatRoutes from "./chat.routes";
import { buildToolList } from "./chat.service";
import {
  cancelChatOrder,
  confirmChatOrder,
  prepareChatOrder,
  resolveVariantId,
} from "./chat.orders.service";

// Confirm/cancel routes don't call streamChat; keep the mock so an accidental
// POST / never hits Anthropic. Preserve buildToolList from the real module.
vi.mock("./chat.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./chat.service")>();
  return {
    ...actual,
    streamChat: vi.fn(async function* () {
      yield { type: "done" as const };
    }),
  };
});

const app = createTestApp(chatRoutes);

const SESSION_A = "00000000-0000-0000-0000-0000000000a1";
const SESSION_B = "00000000-0000-0000-0000-0000000000b2";
const CONVERSATION_ID = "00000000-0000-0000-0000-0000000000c1";

const TEST_ADDRESS = {
  name: "Chat Buyer",
  phone: "01711112222",
  address: "12 Test Road",
  district: "Dhaka",
  upazila: "Gulshan",
};

async function cleanAll() {
  await db.delete(productReviews);
  await db.delete(inventoryMovements);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(inventory);
  await db.delete(productVariants);
  await db.delete(products);
  clearOrderDraftsForTests();
}

async function seedProductVariant(
  stock = 10,
  opts: { size?: string; color?: string; slug?: string } = {},
) {
  const size = opts.size ?? "42";
  const color = opts.color ?? "Red";
  const [product] = await db
    .insert(products)
    .values({
      name: "Chat Order Product",
      slug:
        opts.slug ??
        `chat-ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      basePrice: "2000",
      isActive: true,
    })
    .returning();
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product!.id,
      sku: `SKU-CHAT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: `Size ${size}`,
      size,
      color,
      price: "2000",
      stock,
      reservedStock: 0,
      isActive: true,
    })
    .returning();
  await db.insert(inventory).values({
    variantId: variant!.id,
    quantity: stock,
    reservedQuantity: 0,
  });
  return { product: product!, variant: variant! };
}

beforeAll(async () => {
  await seedTestUsers();
});
beforeEach(async () => {
  await cleanAll();
});
afterEach(() => {
  clearOrderDraftsForTests();
});
afterAll(async () => {
  await cleanAll();
  await cleanTestUsers();
});

describe("buildToolList", () => {
  it("always includes prepare_order; auth-only tools when authenticated", () => {
    const guest = buildToolList(false).map((t) => t.name);
    expect(guest).toContain("prepare_order");
    expect(guest).toContain("search_knowledge");
    expect(guest).toContain("get_product_details");
    expect(guest).not.toContain("get_my_orders");
    expect(guest).not.toContain("get_my_addresses");

    const auth = buildToolList(true).map((t) => t.name);
    expect(auth).toContain("prepare_order");
    expect(auth).toContain("get_my_orders");
    expect(auth).toContain("get_my_addresses");
  });
});

describe("prepareChatOrder", () => {
  it("stores a COD draft with server-calculated shipping", async () => {
    const { variant } = await seedProductVariant(5);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 2 }],
        shippingAddress: TEST_ADDRESS,
        email: "guest@example.com",
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );

    expect(draft.draftId).toBeTruthy();
    expect(draft.paymentMethod).toBe("cash");
    expect(draft.subtotal).toBe("4000.00");
    expect(draft.shippingAmount).toBe("100.00");
    expect(draft.totalAmount).toBe("4100.00");
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]!.productName).toBe("Chat Order Product");
  });

  it("rejects insufficient stock without creating a draft", async () => {
    const { variant } = await seedProductVariant(1);
    await expect(
      prepareChatOrder(
        {
          items: [{ variantId: variant.id, quantity: 5 }],
          shippingAddress: TEST_ADDRESS,
        },
        { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
      ),
    ).rejects.toMatchObject({ code: "BUSINESS_RULE" });
  });

  it("charges 130 BDT shipping when district is not exactly Dhaka", async () => {
    const { variant } = await seedProductVariant(5);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: {
          ...TEST_ADDRESS,
          district: "Chittagong",
          upazila: "Sitakunda",
        },
        email: "guest@example.com",
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );
    expect(draft.shippingAmount).toBe("130.00");
    expect(draft.totalAmount).toBe("2130.00");
  });

  it("charges 130 BDT shipping for an unrecognized district (no Dhaka match)", async () => {
    const { variant } = await seedProductVariant(5);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: {
          ...TEST_ADDRESS,
          district: "NotARealDistrict",
          upazila: "Somewhere",
        },
        email: "guest@example.com",
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );
    expect(draft.shippingAmount).toBe("130.00");
  });

  it("rejects UNKNOWN placeholder shipping fields", async () => {
    const { variant } = await seedProductVariant(3);
    await expect(
      prepareChatOrder(
        {
          items: [{ variantId: variant.id, quantity: 1 }],
          shippingAddress: {
            name: "<UNKNOWN>",
            phone: "<UNKNOWN>",
            address: "<UNKNOWN>",
            district: "<UNKNOWN>",
            upazila: "<UNKNOWN>",
          },
        },
        { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("resolves productSlug + size to a variant without a variantId", async () => {
    const { product, variant } = await seedProductVariant(5, {
      size: "44",
      color: "Red",
      slug: "nike-vomero-18-chat-test",
    });

    const resolved = await resolveVariantId({
      productSlug: product.slug,
      size: "44",
      color: "red",
      quantity: 1,
    });
    expect(resolved).toBe(variant.id);

    const draft = await prepareChatOrder(
      {
        items: [
          {
            productSlug: product.slug,
            size: "44",
            color: "Red",
            quantity: 1,
          },
        ],
        shippingAddress: TEST_ADDRESS,
        email: "guest@example.com",
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );
    expect(draft.items[0]!.variantId).toBe(variant.id);
    expect(draft.totalAmount).toBe("2100.00");
  });
});

describe("POST /chat/orders/prepare", () => {
  it("returns a public draft via HTTP (used by e2e + tool)", async () => {
    const { variant } = await seedProductVariant(5);
    const res = await request(app)
      .post("/orders/prepare")
      .send({
        sessionId: SESSION_A,
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
        email: "guest@example.com",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.draftId).toBeTruthy();
    expect(res.body.data.paymentMethod).toBe("cash");
    expect(res.body.data.shippingAmount).toBe("100.00");
  });
});

describe("POST /chat/orders/confirm", () => {
  it("creates a guest COD order from a draft", async () => {
    const { variant } = await seedProductVariant(8);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
        email: "guest@example.com",
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );

    const res = await request(app)
      .post("/orders/confirm")
      .send({ draftId: draft.draftId, sessionId: SESSION_A });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toMatch(/^ORD-\d{12}$/);
    expect(res.body.data.paymentMethod).toBe("cash");
    expect(res.body.data.guestToken).toBeTruthy();
    expect(res.body.data.confirmationPath).toContain("guestToken=");
    expect(res.body.data.totalAmount).toBe("2100.00");

    const [pv] = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, variant.id));
    expect(pv!.stock).toBe(7);
  });

  it("creates a logged-in order bound to the JWT user", async () => {
    const { variant } = await seedProductVariant(5);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
        email: MOCK_USER.email,
      },
      {
        sessionId: SESSION_A,
        conversationId: CONVERSATION_ID,
        userId: MOCK_USER.id,
      },
    );

    const res = await request(app)
      .post("/orders/confirm")
      .set("Authorization", userToken)
      .send({ draftId: draft.draftId, sessionId: SESSION_A });

    expect(res.status).toBe(201);
    expect(res.body.data.guestToken).toBeNull();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, res.body.data.orderNumber));
    expect(order!.userId).toBe(MOCK_USER.id);
  });

  it("rejects confirm with the wrong session", async () => {
    const { variant } = await seedProductVariant(3);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );

    const res = await request(app)
      .post("/orders/confirm")
      .send({ draftId: draft.draftId, sessionId: SESSION_B });

    expect(res.status).toBe(403);
  });

  it("rejects a second confirm after the draft is consumed", async () => {
    const { variant } = await seedProductVariant(4);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
        email: "guest@example.com",
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );

    const first = await request(app)
      .post("/orders/confirm")
      .send({ draftId: draft.draftId, sessionId: SESSION_A });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/orders/confirm")
      .send({ draftId: draft.draftId, sessionId: SESSION_A });
    expect(second.status).toBe(404);
  });

  it("rejects guest confirming an auth user's draft", async () => {
    const { variant } = await seedProductVariant(3);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
      },
      {
        sessionId: SESSION_A,
        conversationId: CONVERSATION_ID,
        userId: MOCK_USER.id,
      },
    );

    const res = await request(app)
      .post("/orders/confirm")
      .send({ draftId: draft.draftId, sessionId: SESSION_A });

    expect(res.status).toBe(403);
  });
});

describe("POST /chat/orders/cancel", () => {
  it("removes the draft so confirm fails afterward", async () => {
    const { variant } = await seedProductVariant(3);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );

    const cancel = await request(app)
      .post("/orders/cancel")
      .send({ draftId: draft.draftId, sessionId: SESSION_A });
    expect(cancel.status).toBe(200);

    const confirm = await request(app)
      .post("/orders/confirm")
      .send({ draftId: draft.draftId, sessionId: SESSION_A });
    expect(confirm.status).toBe(404);
  });

  it("is idempotent when the draft is already gone", async () => {
    const res = await request(app)
      .post("/orders/cancel")
      .send({ draftId: "missing-draft", sessionId: SESSION_A });
    expect(res.status).toBe(200);
  });
});

describe("confirmChatOrder service restore on failure", () => {
  it("allows cancel after prepare", async () => {
    const { variant } = await seedProductVariant(2);
    const draft = await prepareChatOrder(
      {
        items: [{ variantId: variant.id, quantity: 1 }],
        shippingAddress: TEST_ADDRESS,
      },
      { sessionId: SESSION_A, conversationId: CONVERSATION_ID, userId: null },
    );
    cancelChatOrder(draft.draftId, SESSION_A, null);
    await expect(
      confirmChatOrder(draft.draftId, SESSION_A, null),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
