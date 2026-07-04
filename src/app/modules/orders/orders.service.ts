import {
  and,
  eq,
  desc,
  asc,
  count,
  sum,
  SQL,
  inArray,
  ilike,
  isNull,
  or,
} from "drizzle-orm";
import crypto from "crypto";
import { db } from "../../../db";
import {
  orders,
  orderItems,
  products,
  productImages,
  productVariants,
  inventory,
} from "../../../db/schema";
import { getVariantAvailability } from "../inventory/inventory.service";
import {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from "../../errors/AppError";
import type {
  CreateOrderInput,
  GetOrdersInput,
  UpdateStatusInput,
  UpdatePaymentStatusInput,
  UpdateTrackingInput,
  UpdateFulfillmentInput,
} from "./orders.schema";

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function stripSensitiveFields<T extends Record<string, unknown>>(
  order: T,
): Omit<T, "guestToken" | "guestTokenExpires"> {
  const { guestToken, guestTokenExpires, ...safe } = order;
  return safe as Omit<T, "guestToken" | "guestTokenExpires">;
}

async function fetchOrderItemsWithImages(orderId: string) {
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (items.length === 0) return [];

  const productIds = [
    ...new Set(items.map((i) => i.productId).filter(Boolean)),
  ] as string[];

  if (productIds.length === 0)
    return items.map((i) => ({ ...i, imageUrl: null }));

  const images = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      isPrimary: productImages.isPrimary,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds));

  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const imageMap = new Map<string, string>();
  for (const img of sorted) {
    if (img.productId && !imageMap.has(img.productId)) {
      imageMap.set(img.productId, img.url);
    }
  }

  return items.map((item) => ({
    ...item,
    imageUrl: imageMap.get(item.productId!) ?? null,
  }));
}

export async function createOrder(input: CreateOrderInput, userId?: string) {
  // Resolve variant details + validate stock
  const variantIds = input.items.map((i) => i.variantId);
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

  // Validate all variants exist and have sufficient stock (read from inventory table)
  const availability = await getVariantAvailability(variantIds);
  const availabilityMap = new Map(availability.map((a) => [a.variantId, a]));

  for (const item of input.items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) throw new NotFoundError(`Variant ${item.variantId}`);
    if (!variant.isActive)
      throw new BusinessRuleError(`Variant is not available`);
    const avail = availabilityMap.get(item.variantId);
    const availableStock = avail ? avail.quantity - avail.reservedQuantity : 0;
    if (availableStock < item.quantity)
      throw new BusinessRuleError(
        `Insufficient stock for variant ${item.variantId} (available: ${availableStock})`,
      );
  }

  // Fetch product names and base prices (fallback when variant price is null)
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

  // Calculate totals
  const lineItems = input.items.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId)!;
    const fallbackPrice = productMap[variant.productId!]?.basePrice ?? "0";
    const unitPrice = Number(variant.price ?? fallbackPrice);
    return {
      variantId: item.variantId,
      productId: variant.productId,
      productName: productMap[variant.productId!]?.name ?? "Unknown Product",
      variantName: variant.name,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: (unitPrice * item.quantity).toFixed(2),
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const shippingAmount = input.shippingAmount ?? 0;
  const totalAmount = subtotal + shippingAmount;

  const shippingAddress = input.shippingAddress;
  const billingAddress = input.billingAddress ?? input.shippingAddress;

  // Generate guest token for unauthenticated orders
  const guestToken = !userId ? crypto.randomBytes(32).toString("hex") : null;
  const guestTokenExpires = !userId
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        userId: userId ?? null,
        email: input.email,
        phone: input.phone,
        subtotal: subtotal.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: input.paymentMethod,
        shippingAddress,
        billingAddress,
        shippingName: shippingAddress.name,
        shippingPhone: shippingAddress.phone,
        shippingEmail: input.email,
        shippingDistrict: shippingAddress.district,
        shippingUpazila: shippingAddress.upazila,
        notes: input.notes,
        sessionId: !userId ? (input.sessionId ?? null) : null,
        guestToken,
        guestTokenExpires,
      })
      .returning();

    // Insert order items
    await tx
      .insert(orderItems)
      .values(lineItems.map((item) => ({ ...item, orderId: order!.id })));

    // Decrement stock on both productVariants and inventory (keep in sync)
    for (const item of input.items) {
      const variant = variants.find((v) => v.id === item.variantId)!;
      const avail = availabilityMap.get(item.variantId);
      if (!avail) throw new BusinessRuleError(`No inventory record found for variant ${item.variantId}`);
      const newStock = avail.quantity - item.quantity;

      await tx
        .update(productVariants)
        .set({
          stock: newStock,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(productVariants.id, item.variantId));

      // Sync inventory table
      await tx
        .update(inventory)
        .set({
          quantity: newStock,
          reservedQuantity: (avail?.reservedQuantity ?? 0) + item.quantity,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(inventory.variantId, item.variantId));
    }

    return { ...order!, items: lineItems };
  });
}

export async function getOrders(
  filters: GetOrdersInput,
  requestUser: { id: string; role: string },
) {
  const isAdmin =
    requestUser.role === "admin" || requestUser.role === "service_role";
  const conditions: SQL[] = [];

  // Non-admins can only see their own orders
  if (!isAdmin) conditions.push(eq(orders.userId, requestUser.id));
  else if (filters.userId) conditions.push(eq(orders.userId, filters.userId));

  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.paymentStatus)
    conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(orders.shippingName, term),
        ilike(orders.shippingPhone, term),
        ilike(orders.shippingEmail, term),
        ilike(orders.email, term),
      )!,
    );
  }

  const offset = (filters.page - 1) * filters.limit;
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(orders).where(whereClause),
  ]);

  return {
    data: rows.map(stripSensitiveFields),
    meta: {
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / filters.limit),
        hasNext: offset + rows.length < Number(total),
        hasPrev: filters.page > 1,
      },
    },
  };
}

async function getOrderOrThrow(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) throw new NotFoundError("Order");
  return order;
}

export async function getOrderById(
  id: string,
  requestUser?: { id: string; role: string },
  guestTokenParam?: string,
) {
  const order = await getOrderOrThrow(id);

  if (requestUser) {
    const isAdmin =
      requestUser.role === "admin" || requestUser.role === "service_role";
    if (!isAdmin && order.userId !== requestUser.id)
      throw new ForbiddenError("Access denied");
  } else if (guestTokenParam) {
    if (
      !order.guestToken ||
      order.guestToken !== guestTokenParam ||
      (order.guestTokenExpires &&
        new Date(order.guestTokenExpires) < new Date())
    ) {
      throw new ForbiddenError("Invalid or expired guest token");
    }
  } else {
    throw new ForbiddenError("Access denied");
  }

  const items = await fetchOrderItemsWithImages(id);
  return { ...stripSensitiveFields(order), items };
}

export async function getOrderByNumber(
  orderNumber: string,
  requestUser?: { id: string; role: string },
  guestTokenParam?: string,
) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber));
  if (!order) throw new NotFoundError("Order");

  if (requestUser) {
    const isAdmin =
      requestUser.role === "admin" || requestUser.role === "service_role";
    if (!isAdmin && order.userId !== requestUser.id)
      throw new ForbiddenError("Access denied");
  } else if (guestTokenParam) {
    if (
      !order.guestToken ||
      order.guestToken !== guestTokenParam ||
      (order.guestTokenExpires &&
        new Date(order.guestTokenExpires) < new Date())
    ) {
      throw new ForbiddenError("Invalid or expired guest token");
    }
  }
  // No auth and no guestToken — order number itself is the access key (public guest confirmation)

  const items = await fetchOrderItemsWithImages(order.id);
  return { ...stripSensitiveFields(order), items };
}

export async function cancelOrder(
  id: string,
  requestUser: { id: string; role: string },
) {
  const order = await getOrderOrThrow(id);
  const isAdmin =
    requestUser.role === "admin" || requestUser.role === "service_role";

  if (!isAdmin && order.userId !== requestUser.id)
    throw new ForbiddenError("Access denied");
  if (!isAdmin && order.status !== "pending")
    throw new BusinessRuleError("Only pending orders can be cancelled");
  if (order.status === "cancelled")
    throw new BusinessRuleError("Order is already cancelled");
  if (order.status === "delivered")
    throw new BusinessRuleError("Delivered orders cannot be cancelled");

  // Restore stock
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));
  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.variantId) {
        const [[variant], [inv]] = await Promise.all([
          tx.select({ stock: productVariants.stock })
            .from(productVariants).where(eq(productVariants.id, item.variantId)),
          tx.select({ quantity: inventory.quantity, reservedQuantity: inventory.reservedQuantity })
            .from(inventory).where(eq(inventory.variantId, item.variantId)),
        ]);
        if (variant) {
          const restoredStock = variant.stock + item.quantity;
          await tx
            .update(productVariants)
            .set({ stock: restoredStock })
            .where(eq(productVariants.id, item.variantId));

          if (inv) {
            await tx
              .update(inventory)
              .set({
                quantity: restoredStock,
                reservedQuantity: Math.max(0, (inv.reservedQuantity ?? 0) - item.quantity),
                updatedAt: new Date().toISOString(),
              })
              .where(eq(inventory.variantId, item.variantId));
          }
        }
      }
    }
    await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(orders.id, id));
  });

  const [updated] = await db.select().from(orders).where(eq(orders.id, id));
  return updated!;
}

export async function updateStatus(id: string, input: UpdateStatusInput) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({
      status: input.status,
      ...(input.internalNotes && { internalNotes: input.internalNotes }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function updatePaymentStatus(
  id: string,
  input: UpdatePaymentStatusInput,
) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: input.paymentStatus,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function updateTracking(id: string, input: UpdateTrackingInput) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({
      trackingNumber: input.trackingNumber,
      ...(input.estimatedDeliveryDate && {
        estimatedDeliveryDate: input.estimatedDeliveryDate,
      }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function updateFulfillment(
  id: string,
  input: UpdateFulfillmentInput,
) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({
      fulfillmentStatus: input.fulfillmentStatus,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function getOrderStats() {
  const [row] = await db
    .select({
      totalOrders: count(),
      totalRevenue: sum(orders.totalAmount),
    })
    .from(orders);

  const statusCounts = await db
    .select({ status: orders.status, cnt: count() })
    .from(orders)
    .groupBy(orders.status);

  const byStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, Number(r.cnt)]),
  );

  return {
    totalOrders: Number(row?.totalOrders ?? 0),
    totalRevenue: Number(row?.totalRevenue ?? 0),
    pendingOrders: byStatus["pending"] ?? 0,
    confirmedOrders: byStatus["confirmed"] ?? 0,
    processingOrders: byStatus["processing"] ?? 0,
    shippedOrders: byStatus["shipped"] ?? 0,
    deliveredOrders: byStatus["delivered"] ?? 0,
    cancelledOrders: byStatus["cancelled"] ?? 0,
    refundedOrders: byStatus["refunded"] ?? 0,
  };
}

export async function claimGuestOrders(
  userId: string,
  userEmail: string,
  userPhone?: string,
  sessionId?: string,
) {
  // Run all three strategies in a single transaction to prevent double-claiming
  return db.transaction(async (tx) => {
    let claimed = 0;

    // Strategy 1: Match by session ID (most reliable, same browser)
    if (sessionId) {
      const rows = await tx
        .update(orders)
        .set({ userId, sessionId: null })
        .where(and(eq(orders.sessionId, sessionId), isNull(orders.userId)))
        .returning({ id: orders.id });
      claimed += rows.length;
    }

    // Strategy 2: Match by email (cross-device) — skip already-claimed rows
    if (userEmail) {
      const rows = await tx
        .update(orders)
        .set({ userId })
        .where(and(eq(orders.email, userEmail), isNull(orders.userId)))
        .returning({ id: orders.id });
      claimed += rows.length;
    }

    // Strategy 3: Match by phone number (common in BD market where phone = primary ID)
    if (userPhone) {
      const rows = await tx
        .update(orders)
        .set({ userId })
        .where(and(eq(orders.phone, userPhone), isNull(orders.userId)))
        .returning({ id: orders.id });
      claimed += rows.length;
    }

    return { claimed };
  });
}
