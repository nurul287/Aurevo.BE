import { describe, it, expect } from "vitest";
import {
  buildInvoicePdfBuffer,
  deriveInvoicePayment,
  extractEmailAddress,
  formatAmount,
  type OrderForInvoice,
} from "./invoice-pdf";

function makeOrder(overrides: Partial<OrderForInvoice> = {}): OrderForInvoice {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "customer@example.com",
    orderNumber: "ORD-123-ABCD",
    createdAt: new Date("2026-07-18T09:00:00Z"),
    paymentStatus: "pending",
    shippingPhone: "01840300379",
    notes: null,
    subtotal: "990.00",
    shippingAmount: "60.00",
    totalAmount: "1050.00",
    shippingName: "Test Customer",
    shippingAddress: { address: "123 Test St", upazila: "Senbag", district: "Noakhali" },
    items: [
      {
        productName: "Test Product",
        variantName: "Navy — XL",
        sku: "SKU-1",
        quantity: 1,
        unitPrice: "990.00",
        totalPrice: "990.00",
      },
    ],
    ...overrides,
  };
}

describe("deriveInvoicePayment", () => {
  it("marks the full total as paid when the order is paid", () => {
    expect(deriveInvoicePayment("paid", "1050.00")).toEqual({ paid: "1050.00", due: "0.00" });
  });

  it("marks the full total as due when the order is not paid", () => {
    expect(deriveInvoicePayment("pending", "1050.00")).toEqual({ paid: "0.00", due: "1050.00" });
    expect(deriveInvoicePayment(null, "1050.00")).toEqual({ paid: "0.00", due: "1050.00" });
  });

  it("normalizes amounts to two decimals", () => {
    expect(deriveInvoicePayment("paid", "1050")).toEqual({ paid: "1050.00", due: "0.00" });
  });
});

describe("extractEmailAddress", () => {
  it("pulls the bare address out of a display-name form", () => {
    expect(extractEmailAddress("Aurevo Fashion <orders@aurevofashion.store>")).toBe(
      "orders@aurevofashion.store",
    );
  });

  it("returns a bare address unchanged", () => {
    expect(extractEmailAddress("orders@aurevofashion.store")).toBe("orders@aurevofashion.store");
  });
});

describe("formatAmount", () => {
  it("formats strings, numbers, and nullish to two decimals", () => {
    expect(formatAmount("990")).toBe("990.00");
    expect(formatAmount(60.5)).toBe("60.50");
    expect(formatAmount(null)).toBe("0.00");
    expect(formatAmount(undefined)).toBe("0.00");
    expect(formatAmount("not-a-number")).toBe("0.00");
  });
});

describe("buildInvoicePdfBuffer", () => {
  it("produces a non-empty, well-formed PDF for a normal order", async () => {
    const buf = await buildInvoicePdfBuffer(makeOrder());
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders a many-item order across a page break without throwing", async () => {
    const items = Array.from({ length: 24 }, (_, i) => ({
      productName: `Product ${i + 1}`,
      variantName: i % 2 === 0 ? `Variant ${i}` : null,
      sku: `SKU-${i}`,
      quantity: i + 1,
      unitPrice: "100.00",
      totalPrice: `${(i + 1) * 100}.00`,
    }));
    const buf = await buildInvoicePdfBuffer(makeOrder({ items }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(0);
  });

  it("embeds Bengali script in name/address/notes without throwing", async () => {
    const buf = await buildInvoicePdfBuffer(
      makeOrder({
        shippingName: "নুরুল আলম",
        notes: "দয়া করে বিকেলের পরে দিন।",
        shippingAddress: { address: "মিরপুর", upazila: "সেনবাগ", district: "নোয়াখালী" },
      }),
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(0);
  });
});
