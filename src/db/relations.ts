import { relations } from "drizzle-orm/relations";
import { products, productReviews, profiles, orders, cartItems, productVariants, wishlistItems, productImages, categories, brands, users, addresses, userAddresses, payments, orderItems, inventoryMovements, metaCapiSent, inventory } from "./schema";

export const productReviewsRelations = relations(productReviews, ({one}) => ({
	product: one(products, {
		fields: [productReviews.productId],
		references: [products.id]
	}),
	profile: one(profiles, {
		fields: [productReviews.userId],
		references: [profiles.id]
	}),
	order: one(orders, {
		fields: [productReviews.orderId],
		references: [orders.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	productReviews: many(productReviews),
	cartItems: many(cartItems),
	wishlistItems: many(wishlistItems),
	productImages: many(productImages),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	brand: one(brands, {
		fields: [products.brandId],
		references: [brands.id]
	}),
	productVariants: many(productVariants),
	orderItems: many(orderItems),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	productReviews: many(productReviews),
	cartItems: many(cartItems),
	wishlistItems: many(wishlistItems),
	userAddresses: many(userAddresses),
	orders: many(orders),
	inventoryMovements: many(inventoryMovements),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	productReviews: many(productReviews),
	payments: many(payments),
	profile: one(profiles, {
		fields: [orders.userId],
		references: [profiles.id]
	}),
	orderItems: many(orderItems),
	inventoryMovements: many(inventoryMovements),
	metaCapiSents: many(metaCapiSent),
}));

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	profile: one(profiles, {
		fields: [cartItems.userId],
		references: [profiles.id]
	}),
	product: one(products, {
		fields: [cartItems.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [cartItems.variantId],
		references: [productVariants.id]
	}),
}));

export const productVariantsRelations = relations(productVariants, ({one, many}) => ({
	cartItems: many(cartItems),
	wishlistItems: many(wishlistItems),
	productImages: many(productImages),
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
	orderItems: many(orderItems),
	inventoryMovements: many(inventoryMovements),
	inventories: many(inventory),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({one}) => ({
	profile: one(profiles, {
		fields: [wishlistItems.userId],
		references: [profiles.id]
	}),
	product: one(products, {
		fields: [wishlistItems.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [wishlistItems.variantId],
		references: [productVariants.id]
	}),
}));

export const productImagesRelations = relations(productImages, ({one}) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [productImages.variantId],
		references: [productVariants.id]
	}),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	products: many(products),
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
}));

export const brandsRelations = relations(brands, ({many}) => ({
	products: many(products),
}));

export const addressesRelations = relations(addresses, ({one}) => ({
	user: one(users, {
		fields: [addresses.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	addresses: many(addresses),
}));

export const userAddressesRelations = relations(userAddresses, ({one}) => ({
	profile: one(profiles, {
		fields: [userAddresses.userId],
		references: [profiles.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [orderItems.variantId],
		references: [productVariants.id]
	}),
	inventoryMovements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({one}) => ({
	productVariant: one(productVariants, {
		fields: [inventoryMovements.variantId],
		references: [productVariants.id]
	}),
	order: one(orders, {
		fields: [inventoryMovements.orderId],
		references: [orders.id]
	}),
	orderItem: one(orderItems, {
		fields: [inventoryMovements.orderItemId],
		references: [orderItems.id]
	}),
	profile: one(profiles, {
		fields: [inventoryMovements.userId],
		references: [profiles.id]
	}),
}));

export const metaCapiSentRelations = relations(metaCapiSent, ({one}) => ({
	order: one(orders, {
		fields: [metaCapiSent.orderId],
		references: [orders.id]
	}),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
	productVariant: one(productVariants, {
		fields: [inventory.variantId],
		references: [productVariants.id]
	}),
}));