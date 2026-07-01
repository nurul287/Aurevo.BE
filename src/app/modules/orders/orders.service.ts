import { and, eq, desc, asc, count, sum, SQL, inArray, ilike, or } from "drizzle-orm";
import { db } from "../../../db";
import { orders, orderItems, products, productVariants } from "../../../db/schema";
import { NotFoundError, ForbiddenError, BusinessRuleError } from "../../errors/AppError";
import type {
  CreateOrderInput, GetOrdersInput, UpdateStatusInput,
  UpdatePaymentStatusInput, UpdateTrackingInput, UpdateFulfillmentInput,
} from "./orders.schema";

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createOrder(input: CreateOrderInput, userId?: string) {
  // Resolve variant details + validate stock
  const variantIds = input.items.map(i => i.variantId);
  const variants = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      name: productVariants.name,
      price: productVariants.price,
      stock: productVariants.stock,
      reservedStock: productVariants.reservedStock,
      isActive: productVariants.isActive,
      productId: productVariants.productId,
    })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));

  // Validate all variants exist and have sufficient stock
  for (const item of input.items) {
    const variant = variants.find(v => v.id === item.variantId);
    if (!variant) throw new NotFoundError(`Variant ${item.variantId}`);
    if (!variant.isActive) throw new BusinessRuleError(`Variant is not available`);
    if (variant.stock < item.quantity) throw new BusinessRuleError(`Insufficient stock for variant ${item.variantId} (available: ${variant.stock})`);
  }

  // Fetch product names
  const productIds = [...new Set(variants.map(v => v.productId).filter(Boolean))] as string[];
  const prods = productIds.length
    ? await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, productIds))
    : [];
  const productMap = Object.fromEntries(prods.map(p => [p.id, p.name]));

  // Calculate totals
  const lineItems = input.items.map(item => {
    const variant = variants.find(v => v.id === item.variantId)!;
    const unitPrice = Number(variant.price ?? 0);
    return {
      variantId: item.variantId,
      productId: variant.productId,
      productName: productMap[variant.productId!] ?? "Unknown Product",
      variantName: variant.name,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: (unitPrice * item.quantity).toFixed(2),
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const totalAmount = subtotal; // tax + shipping at 0 for simplicity

  const shippingAddress = input.shippingAddress;
  const billingAddress = input.billingAddress ?? input.shippingAddress;

  return db.transaction(async (tx) => {
    // Create order
    const [order] = await tx.insert(orders).values({
      orderNumber: generateOrderNumber(),
      userId: userId ?? null,
      email: input.email,
      phone: input.phone,
      subtotal: subtotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentMethod: input.paymentMethod,
      shippingAddress: billingAddress,
      billingAddress,
      shippingName: shippingAddress.name,
      shippingPhone: shippingAddress.phone,
      shippingEmail: input.email,
      shippingDistrict: shippingAddress.district,
      shippingUpazila: shippingAddress.upazila,
      notes: input.notes,
    }).returning();

    // Insert order items
    await tx.insert(orderItems).values(
      lineItems.map(item => ({ ...item, orderId: order!.id }))
    );

    // Decrement stock
    for (const item of input.items) {
      const variant = variants.find(v => v.id === item.variantId)!;
      await tx
        .update(productVariants)
        .set({
          stock: variant.stock - item.quantity,
          reservedStock: variant.reservedStock + item.quantity,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(productVariants.id, item.variantId));
    }

    return { ...order!, items: lineItems };
  });
}

export async function getOrders(filters: GetOrdersInput, requestUser: { id: string; role: string }) {
  const isAdmin = requestUser.role === "admin" || requestUser.role === "service_role";
  const conditions: SQL[] = [];

  // Non-admins can only see their own orders
  if (!isAdmin) conditions.push(eq(orders.userId, requestUser.id));
  else if (filters.userId) conditions.push(eq(orders.userId, filters.userId));

  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(orders.shippingName, term),
        ilike(orders.shippingPhone, term),
        ilike(orders.shippingEmail, term),
        ilike(orders.email, term),
      )!
    );
  }

  const offset = (filters.page - 1) * filters.limit;
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(filters.limit).offset(offset),
    db.select({ total: count() }).from(orders).where(whereClause),
  ]);

  return {
    data: rows,
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

export async function getOrderById(id: string, requestUser?: { id: string; role: string }) {
  const order = await getOrderOrThrow(id);

  if (requestUser) {
    const isAdmin = requestUser.role === "admin" || requestUser.role === "service_role";
    if (!isAdmin && order.userId !== requestUser.id) throw new ForbiddenError("Access denied");
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function getOrderByNumber(orderNumber: string) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  if (!order) throw new NotFoundError("Order");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function cancelOrder(id: string, requestUser: { id: string; role: string }) {
  const order = await getOrderOrThrow(id);
  const isAdmin = requestUser.role === "admin" || requestUser.role === "service_role";

  if (!isAdmin && order.userId !== requestUser.id) throw new ForbiddenError("Access denied");
  if (!isAdmin && order.status !== "pending") throw new BusinessRuleError("Only pending orders can be cancelled");
  if (order.status === "cancelled") throw new BusinessRuleError("Order is already cancelled");
  if (order.status === "delivered") throw new BusinessRuleError("Delivered orders cannot be cancelled");

  // Restore stock
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.variantId) {
        const [variant] = await tx.select({ stock: productVariants.stock, reservedStock: productVariants.reservedStock }).from(productVariants).where(eq(productVariants.id, item.variantId));
        if (variant) {
          await tx.update(productVariants).set({
            stock: variant.stock + item.quantity,
            reservedStock: Math.max(0, variant.reservedStock - item.quantity),
          }).where(eq(productVariants.id, item.variantId));
        }
      }
    }
    await tx.update(orders).set({ status: "cancelled", updatedAt: new Date().toISOString() }).where(eq(orders.id, id));
  });

  const [updated] = await db.select().from(orders).where(eq(orders.id, id));
  return updated!;
}

export async function updateStatus(id: string, input: UpdateStatusInput) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({ status: input.status, ...(input.internalNotes && { internalNotes: input.internalNotes }), updatedAt: new Date().toISOString() })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function updatePaymentStatus(id: string, input: UpdatePaymentStatusInput) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({ paymentStatus: input.paymentStatus, updatedAt: new Date().toISOString() })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function updateTracking(id: string, input: UpdateTrackingInput) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({ trackingNumber: input.trackingNumber, ...(input.estimatedDeliveryDate && { estimatedDeliveryDate: input.estimatedDeliveryDate }), updatedAt: new Date().toISOString() })
    .where(eq(orders.id, id))
    .returning();
  return updated!;
}

export async function updateFulfillment(id: string, input: UpdateFulfillmentInput) {
  await getOrderOrThrow(id);
  const [updated] = await db
    .update(orders)
    .set({ fulfillmentStatus: input.fulfillmentStatus, updatedAt: new Date().toISOString() })
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

  const byStatus = Object.fromEntries(statusCounts.map(r => [r.status, Number(r.cnt)]));

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
