import { count, eq, ne, and, sum, desc, lt } from "drizzle-orm";
import { db } from "../../../db";
import { orders, products, profiles, inventory, productVariants, orderItems } from "../../../db/schema";

export async function getAdminDashboard() {
  const [
    [{ totalOrders }],
    [{ totalProducts }],
    [{ totalCustomers }],
    revenueRows,
    recentOrders,
    inventoryRows,
  ] = await Promise.all([
    db.select({ totalOrders: count() }).from(orders),
    db.select({ totalProducts: count() }).from(products).where(eq(products.isActive, true)),
    db.select({ totalCustomers: count() }).from(profiles),
    db
      .select({ totalAmount: sum(orders.totalAmount) })
      .from(orders)
      .where(and(ne(orders.status, "cancelled"), ne(orders.status, "refunded"))),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        shippingAddress: orders.shippingAddress,
        userId: orders.userId,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5),
    db
      .select({
        quantity: inventory.quantity,
        reservedQuantity: inventory.reservedQuantity,
        reorderPoint: inventory.reorderPoint,
        variantId: inventory.variantId,
      })
      .from(inventory)
      .innerJoin(productVariants, and(eq(inventory.variantId, productVariants.id), eq(productVariants.isActive, true))),
  ]);

  let lowStockCount = 0;
  let outOfStockCount = 0;
  for (const row of inventoryRows) {
    const available = (row.quantity ?? 0) - (row.reservedQuantity ?? 0);
    const threshold = row.reorderPoint ?? 5;
    if (available <= 0) outOfStockCount++;
    else if (available <= threshold) lowStockCount++;
  }

  return {
    totalOrders: Number(totalOrders),
    totalRevenue: Number(revenueRows[0]?.totalAmount ?? 0),
    totalProducts: Number(totalProducts),
    totalCustomers: Number(totalCustomers),
    recentOrders,
    inventory: {
      lowStockCount,
      outOfStockCount,
      trackedVariants: inventoryRows.length,
    },
  };
}
