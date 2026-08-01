import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { productVariants, products } from "../../../db/schema";
import { sendOrderConfirmationEmail } from "../../../lib/email";
import { logger } from "../../../lib/logger";
import { config } from "../../config";
import {
  AppError,
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors/AppError";
import { getVariantAvailability } from "../inventory/inventory.service";
import { calculateShippingAmount, createOrder } from "../orders/orders.service";
import {
  deleteOrderDraft,
  getOrderDraft,
  setOrderDraftForRestore,
  storeOrderDraft,
  toPublicOrderDraft,
  type ChatOrderDraft,
  type ChatOrderDraftAddress,
} from "./chat.order-draft";

/** Line input: either a known variant UUID, or product slug/id + size (+ color). */
export type PrepareOrderLineInput = {
  variantId?: string | null;
  productSlug?: string | null;
  productId?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
};

export type PrepareOrderInput = {
  items: PrepareOrderLineInput[];
  shippingAddress: ChatOrderDraftAddress;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mergeItems(
  items: Array<{ variantId: string; quantity: number }>,
): Array<{ variantId: string; quantity: number }> {
  return Object.values(
    items.reduce<Record<string, { variantId: string; quantity: number }>>(
      (acc, item) => {
        const line = (acc[item.variantId] ??= {
          variantId: item.variantId,
          quantity: 0,
        });
        line.quantity += item.quantity;
        return acc;
      },
      {},
    ),
  );
}

function normalizeSize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function sizeMatches(requested: string, candidate: string | null): boolean {
  if (!candidate) return false;
  const a = normalizeSize(requested);
  const b = normalizeSize(candidate);
  if (a === b) return true;
  // "44" vs "eu44" / "size44"
  const stripPrefix = (s: string) => s.replace(/^(eu|uk|us|size)/, "");
  const digitsA = a.replace(/\D/g, "");
  const digitsB = b.replace(/\D/g, "");
  if (digitsA && digitsA === digitsB) {
    const aCore = stripPrefix(a);
    const bCore = stripPrefix(b);
    return aCore === digitsA || bCore === digitsB || aCore === bCore;
  }
  return false;
}

function colorMatches(
  requested: string | null | undefined,
  candidate: string | null,
): boolean {
  if (!requested?.trim()) return true;
  if (!candidate) return false;
  const a = requested.trim().toLowerCase();
  const b = candidate.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Resolve a chat line to a concrete variant UUID. Prefers an explicit variantId;
 * otherwise looks up by productSlug/productId + size (+ optional color).
 * Exported for unit tests.
 */
export async function resolveVariantId(
  line: PrepareOrderLineInput,
): Promise<string> {
  const direct = line.variantId?.trim();
  if (direct && UUID_RE.test(direct)) return direct;

  const slug = line.productSlug?.trim();
  const productId = line.productId?.trim();
  const size = line.size?.trim();
  if (!size || (!slug && !productId)) {
    throw new ValidationError(
      "Each item needs either variantId, or productSlug/productId plus size",
    );
  }

  let product: { id: string } | undefined;
  if (productId && UUID_RE.test(productId)) {
    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    product = row;
  }
  if (!product && slug) {
    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug));
    product = row;
  }
  if (!product) {
    throw new NotFoundError(`Product ${slug ?? productId ?? "unknown"}`);
  }

  const variants = await db
    .select({
      id: productVariants.id,
      size: productVariants.size,
      color: productVariants.color,
      isActive: productVariants.isActive,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, product.id),
        eq(productVariants.isActive, true),
      ),
    );

  const bySize = variants.filter((v) => sizeMatches(size, v.size));
  if (bySize.length === 0) {
    const available =
      variants
        .map((v) => v.size)
        .filter(Boolean)
        .join(", ") || "none";
    throw new BusinessRuleError(
      `Size "${size}" is not available for this product (available: ${available})`,
    );
  }

  const byColor = bySize.filter((v) => colorMatches(line.color, v.color));
  const matched = byColor.length > 0 ? byColor : bySize;
  if (matched.length > 1 && line.color?.trim()) {
    // Ambiguous even with color — pick exact color match if any
    const exact = matched.filter(
      (v) =>
        (v.color ?? "").trim().toLowerCase() ===
        line.color!.trim().toLowerCase(),
    );
    if (exact.length === 1) return exact[0]!.id;
  }
  if (matched.length > 1 && !line.color?.trim()) {
    throw new BusinessRuleError(
      `Multiple variants match size "${size}". Specify color. Options: ${matched
        .map((v) => v.color ?? "unknown")
        .join(", ")}`,
    );
  }
  return matched[0]!.id;
}

/** Reject model-invented placeholders like UNKNOWN / N/A / TBD. */
export function isPlaceholderField(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.trim();
  if (v.length < 2) return true;
  return /^(<?\s*unknown\s*>?|n\/a|na|tbd|none|null|undefined|not\s*provided|your\s+name|full\s+name|address\s+here)$/i.test(
    v,
  );
}

export function assertCompleteShippingAddress(
  addr: ChatOrderDraftAddress | null | undefined,
): void {
  if (!addr) {
    throw new ValidationError(
      "shippingAddress requires name, phone, address, district, and upazila",
    );
  }
  const missing: string[] = [];
  for (const key of [
    "name",
    "phone",
    "address",
    "district",
    "upazila",
  ] as const) {
    if (isPlaceholderField(addr[key])) missing.push(key);
  }
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing or invalid shipping fields: ${missing.join(", ")}. Ask the customer for each missing field one at a time — never use UNKNOWN placeholders.`,
    );
  }
}

/** Public draft is safe to show in the Confirm card. */
export function isPublicDraftComplete(
  draft: ReturnType<typeof toPublicOrderDraft>,
): boolean {
  try {
    assertCompleteShippingAddress(draft.shippingAddress);
    return draft.items.length > 0 && Number(draft.totalAmount) > 0;
  } catch {
    return false;
  }
}

/**
 * Validate stock/prices, compute COD totals, and store a short-TTL draft.
 * Does not create an order — the FE Confirm button calls confirmChatOrder.
 */
export async function prepareChatOrder(
  input: PrepareOrderInput,
  ctx: {
    sessionId: string;
    conversationId: string;
    userId: string | null;
  },
): Promise<ReturnType<typeof toPublicOrderDraft>> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ValidationError("At least one item is required");
  }

  const addr = input.shippingAddress;
  assertCompleteShippingAddress(addr);

  const resolvedLines: Array<{ variantId: string; quantity: number }> = [];
  for (const line of input.items) {
    const quantity = Number(line.quantity);
    if (Number.isNaN(quantity) || quantity < 1) {
      throw new ValidationError("Each item needs quantity >= 1");
    }
    if (quantity > 100) {
      throw new ValidationError("Quantity per line cannot exceed 100");
    }
    const variantId = await resolveVariantId(line);
    resolvedLines.push({ variantId, quantity });
  }

  const items = mergeItems(resolvedLines);

  const variantIds = items.map((i) => i.variantId);
  const variants = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      name: productVariants.name,
      price: productVariants.price,
      stock: productVariants.stock,
      isActive: productVariants.isActive,
      productId: productVariants.productId,
    })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));

  const availability = await getVariantAvailability(variantIds);
  const availabilityMap = new Map(availability.map((a) => [a.variantId, a]));

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) throw new NotFoundError(`Variant ${item.variantId}`);
    if (!variant.isActive) {
      throw new BusinessRuleError("Variant is not available");
    }
    const avail = availabilityMap.get(item.variantId);
    const availableStock = avail ? avail.quantity - avail.reservedQuantity : 0;
    if (availableStock < item.quantity) {
      throw new BusinessRuleError(
        `Insufficient stock for variant ${item.variantId} (available: ${availableStock})`,
      );
    }
  }

  const productIds = [
    ...new Set(variants.map((v) => v.productId).filter(Boolean)),
  ] as string[];
  const prods = productIds.length
    ? await db
        .select({
          id: products.id,
          name: products.name,
          basePrice: products.basePrice,
        })
        .from(products)
        .where(inArray(products.id, productIds))
    : [];
  const productMap = Object.fromEntries(
    prods.map((p) => [p.id, { name: p.name, basePrice: p.basePrice }]),
  );

  const lineItems = items.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId)!;
    const fallbackPrice = productMap[variant.productId!]?.basePrice ?? "0";
    const unitPrice = Number(variant.price ?? fallbackPrice);
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      productName: productMap[variant.productId!]?.name ?? "Unknown Product",
      variantName: variant.name,
      unitPrice: unitPrice.toFixed(2),
      lineTotal: (unitPrice * item.quantity).toFixed(2),
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);
  // Chat collects district as free text — only exact "Dhaka" is 100 BDT;
  // any non-match (Chittagong, typos, unknown) is 130 BDT. Same as checkout.
  const shippingAmount = calculateShippingAmount(addr.district);
  const totalAmount = subtotal + shippingAmount;

  const draft = storeOrderDraft({
    sessionId: ctx.sessionId,
    conversationId: ctx.conversationId,
    userId: ctx.userId,
    items: lineItems,
    shippingAddress: {
      name: addr.name.trim(),
      phone: addr.phone.trim(),
      address: addr.address.trim(),
      district: addr.district.trim(),
      upazila: addr.upazila.trim(),
    },
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || addr.phone.trim(),
    notes: input.notes?.trim() || null,
    subtotal: subtotal.toFixed(2),
    shippingAmount: shippingAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  });

  return toPublicOrderDraft(draft);
}

function assertDraftAccess(
  draft: ChatOrderDraft,
  sessionId: string,
  userId: string | null,
): void {
  if (draft.sessionId !== sessionId) {
    throw new ForbiddenError("This order draft belongs to a different session");
  }
  if (draft.userId !== (userId ?? null)) {
    throw new ForbiddenError("This order draft belongs to a different user");
  }
}

export async function confirmChatOrder(
  draftId: string,
  sessionId: string,
  userId: string | null,
) {
  const draft = getOrderDraft(draftId);
  if (!draft) {
    throw new NotFoundError("Order draft");
  }
  assertDraftAccess(draft, sessionId, userId);

  // Delete first so a double-click can't create two orders from one draft.
  deleteOrderDraft(draftId);

  try {
    const order = await createOrder(
      {
        email: draft.email,
        phone: draft.phone ?? draft.shippingAddress.phone,
        paymentMethod: "cash",
        shippingAddress: draft.shippingAddress,
        shippingAmount: Number(draft.shippingAmount),
        sessionId: draft.sessionId,
        notes: draft.notes
          ? `${draft.notes} [chat:${draft.conversationId}]`
          : `Placed via Aurevo AI chat [chat:${draft.conversationId}]`,
        items: draft.items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      },
      userId ?? undefined,
    );

    void sendOrderConfirmationEmail(order).catch((err) =>
      logger.error({ err }, "chat order confirmation email failed"),
    );

    const confirmationPath = buildConfirmationPath(order);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      guestToken: order.guestToken ?? null,
      subtotal: order.subtotal,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      paymentMethod: "cash" as const,
      confirmationPath,
      confirmationUrl: `${config.FRONTEND_URL}${confirmationPath}`,
      items: draft.items,
    };
  } catch (err) {
    setOrderDraftForRestore(draft);
    throw err;
  }
}

export function cancelChatOrder(
  draftId: string,
  sessionId: string,
  userId: string | null,
): void {
  const draft = getOrderDraft(draftId);
  if (!draft) {
    return;
  }
  assertDraftAccess(draft, sessionId, userId);
  deleteOrderDraft(draftId);
}

function buildConfirmationPath(order: {
  id: string;
  orderNumber: string;
  guestToken?: string | null;
}): string {
  const params = new URLSearchParams({
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
  if (order.guestToken) params.set("guestToken", order.guestToken);
  return `/order-confirmation?${params.toString()}`;
}

/** Map AppError (and unknown) to a tool-result string for the model. */
export function formatToolError(err: unknown): string {
  if (err instanceof AppError) {
    return JSON.stringify({ error: err.message, code: err.code });
  }
  logger.error({ err }, "unexpected chat order tool error");
  return JSON.stringify({
    error: "Something went wrong preparing the order. Please try again.",
    code: "INTERNAL_ERROR",
  });
}
