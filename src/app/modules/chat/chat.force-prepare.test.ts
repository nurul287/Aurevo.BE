import { describe, expect, it } from "vitest";
import {
  isStillCollectingOrderInfo,
  shouldForcePrepareOrder,
  shouldSoftNudgeAwayFromCart,
} from "./chat.service";
import { isPlaceholderField } from "./chat.orders.service";

describe("shouldForcePrepareOrder", () => {
  it("returns false when a draft was already prepared", () => {
    expect(
      shouldForcePrepareOrder(
        "Shipping to: Nuru Alam, Dhaka\nPhone: 01700000000\nPayment: Cash on Delivery\nPlease add this product to your cart",
        true,
      ),
    ).toBe(false);
  });

  it("does not force while still asking for the customer's name", () => {
    expect(
      shouldForcePrepareOrder("start: What is your full name?", false),
    ).toBe(false);
    expect(isStillCollectingOrderInfo("What is your full name?")).toBe(true);
  });

  it("does not force while asking optional email or anything else", () => {
    expect(
      isStillCollectingOrderInfo(
        "What's your email? (optional) — tap Skip if you'd rather not share.",
      ),
    ).toBe(true);
    expect(
      shouldForcePrepareOrder(
        "What's your email? (optional) — tap Skip if you'd rather not share.",
        false,
      ),
    ).toBe(false);
    expect(
      isStillCollectingOrderInfo("Want anything else in this order?"),
    ).toBe(true);
  });

  it("does not treat a summary Email: line as still collecting", () => {
    expect(
      isStillCollectingOrderInfo(
        "Order summary:\n- Shipping to: Nuru Alam, Dhaka\n- Phone: 01711112222\n- Email: a@b.com\n- Payment: Cash on Delivery",
      ),
    ).toBe(false);
  });

  it("does not force on cart fallback without a real shipping summary", () => {
    expect(
      shouldForcePrepareOrder(
        "Please visit Aurevo Fashion's website directly, add this product to your cart, and complete checkout with Cash on Delivery.",
        false,
      ),
    ).toBe(false);
    expect(
      shouldSoftNudgeAwayFromCart(
        "Please visit Aurevo Fashion's website directly, add this product to your cart, and complete checkout with Cash on Delivery.",
        false,
      ),
    ).toBe(true);
  });

  it("forces when a complete COD shipping summary was shown without prepare", () => {
    expect(
      shouldForcePrepareOrder(
        "Order summary:\n- Shipping to: Nuru Alam, Moijdupur, Senbag, Chittagong\n- Phone: 01711112222\n- Email: a@b.com\n- Payment: Cash on Delivery",
        false,
      ),
    ).toBe(true);
  });

  it("does not force on a normal product answer", () => {
    expect(
      shouldForcePrepareOrder(
        "The Nike Vomero 18 is in stock in sizes 40–44 for BDT 2,550.",
        false,
      ),
    ).toBe(false);
  });
});

describe("isPlaceholderField", () => {
  it("rejects UNKNOWN placeholders the model invents", () => {
    expect(isPlaceholderField("<UNKNOWN>")).toBe(true);
    expect(isPlaceholderField("UNKNOWN")).toBe(true);
    expect(isPlaceholderField("N/A")).toBe(true);
    expect(isPlaceholderField("Nuru Alam")).toBe(false);
    expect(isPlaceholderField("Dhaka")).toBe(false);
  });
});
