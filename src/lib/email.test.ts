import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrderForEmail } from "./email";

// vi.mock factories are hoisted above these declarations, so the mock fns they
// reference must be created with vi.hoisted (not plain top-level consts).
const { sendMock, buildInvoicePdfBufferMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  buildInvoicePdfBufferMock: vi.fn(),
}));

// Capture every Resend send call. new Resend(...) returns this stub.
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

// emailEnabled() is Boolean(config.RESEND_API_KEY); CI leaves it unset, so force
// it on here to make the send path deterministic regardless of environment.
vi.mock("../app/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/config")>();
  return {
    config: {
      ...actual.config,
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "Aurevo Fashion <orders@aurevofashion.store>",
    },
  };
});

// Drive the invoice-pdf dependency directly (success vs. failure).
vi.mock("./invoice-pdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./invoice-pdf")>();
  return { ...actual, buildInvoicePdfBuffer: buildInvoicePdfBufferMock };
});

import { sendOrderConfirmationEmail } from "./email";

function makeOrder(overrides: Partial<OrderForEmail> = {}): OrderForEmail {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "customer@example.com",
    orderNumber: "ORD-EMAIL-1",
    createdAt: new Date("2026-07-18T09:00:00Z"),
    paymentStatus: "pending",
    shippingPhone: "01840300379",
    notes: null,
    subtotal: "990.00",
    shippingAmount: "60.00",
    totalAmount: "1050.00",
    shippingName: "Test Customer",
    shippingAddress: { address: "123 Test St", upazila: "Senbag", district: "Noakhali" },
    guestToken: "test-guest-token",
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

describe("sendOrderConfirmationEmail", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: "email_1" }, error: null });
    buildInvoicePdfBufferMock.mockReset().mockResolvedValue(Buffer.from("%PDF-fake"));
  });

  it("attaches the generated invoice PDF", async () => {
    await sendOrderConfirmationEmail(makeOrder());

    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0]![0];
    expect(arg.attachments).toHaveLength(1);
    expect(arg.attachments[0].filename).toBe("invoice-ORD-EMAIL-1.pdf");
    expect(Buffer.isBuffer(arg.attachments[0].content)).toBe(true);
  });

  it("still sends the email without an attachment when PDF generation fails", async () => {
    buildInvoicePdfBufferMock.mockRejectedValue(new Error("pdf boom"));

    await sendOrderConfirmationEmail(makeOrder());

    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0]![0];
    expect(arg.attachments).toBeUndefined();
  });

  it("skips sending entirely when the order has no email", async () => {
    await sendOrderConfirmationEmail(makeOrder({ email: null }));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("includes a confirmation-page link with the guest token for guest orders", async () => {
    await sendOrderConfirmationEmail(
      makeOrder({ id: "22222222-2222-2222-2222-222222222222", guestToken: "abc123" }),
    );

    const html = sendMock.mock.calls[0]![0].html as string;
    expect(html).toContain(
      "/order-confirmation?orderId=22222222-2222-2222-2222-222222222222&orderNumber=ORD-EMAIL-1&guestToken=abc123",
    );
  });

  it("omits the guestToken param for logged-in orders", async () => {
    await sendOrderConfirmationEmail(makeOrder({ guestToken: null }));

    const html = sendMock.mock.calls[0]![0].html as string;
    expect(html).not.toContain("guestToken=");
  });

  it("shows a generic item-count/total summary instead of a per-item breakdown (the PDF has that)", async () => {
    await sendOrderConfirmationEmail(
      makeOrder({
        totalAmount: "1050.00",
        items: [
          {
            productName: "Test Product",
            variantName: "Navy — XL",
            sku: "SKU-1",
            quantity: 2,
            unitPrice: "990.00",
            totalPrice: "1980.00",
          },
        ],
      }),
    );

    const html = sendMock.mock.calls[0]![0].html as string;
    expect(html).toContain("2 items");
    expect(html).toContain("1050.00");
    expect(html).toContain("attached as a PDF");
    // No more per-line item table — that detail lives in the PDF now.
    expect(html).not.toContain("SKU-1");
    expect(html).not.toContain("Navy — XL");
  });
});
