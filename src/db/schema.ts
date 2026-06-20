import { pgTable, index, foreignKey, unique, pgPolicy, check, uuid, integer, text, boolean, timestamp, numeric, uniqueIndex, jsonb, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const addressType = pgEnum("address_type", ['billing', 'shipping'])
export const fulfillmentStatus = pgEnum("fulfillment_status", ['unfulfilled', 'partial', 'fulfilled'])
export const movementReason = pgEnum("movement_reason", ['purchase_order', 'customer_order', 'checkout_reserve', 'payment_failed', 'order_cancelled', 'customer_return', 'damaged_goods', 'inventory_count', 'theft_loss', 'location_transfer', 'manual_adjustment'])
export const movementType = pgEnum("movement_type", ['restock', 'sale', 'reserve', 'unreserve', 'cancel', 'return', 'adjustment', 'damage', 'theft', 'transfer'])
export const orderStatus = pgEnum("order_status", ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
export const paymentMethod = pgEnum("payment_method", ['cash', 'online'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'])
export const productGender = pgEnum("product_gender", ['men', 'women', 'unisex'])
export const userGender = pgEnum("user_gender", ['male', 'female', 'other'])


export const productReviews = pgTable("product_reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	userId: uuid("user_id"),
	orderId: uuid("order_id"),
	rating: integer().notNull(),
	title: text(),
	content: text(),
	isVerifiedPurchase: boolean("is_verified_purchase").default(false),
	isApproved: boolean("is_approved").default(false),
	helpfulCount: integer("helpful_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reviews_approved").using("btree", table.isApproved.asc().nullsLast().op("bool_ops")).where(sql`(is_approved = true)`),
	index("idx_reviews_product").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("idx_reviews_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_reviews_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "product_reviews_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "product_reviews_order_id_fkey"
		}),
	unique("product_reviews_product_id_user_id_order_id_key").on(table.productId, table.userId, table.orderId),
	pgPolicy("Admins can manage all reviews", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can delete own reviews", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can update own reviews", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can insert own reviews", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own reviews", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Anyone can view approved reviews", { as: "permissive", for: "select", to: ["public"] }),
	check("product_reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const cartItems = pgTable("cart_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	sessionId: text("session_id"),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	quantity: integer().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cart_items_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_cart_items_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "cart_items_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "cart_items_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "cart_items_variant_id_fkey"
		}).onDelete("cascade"),
	unique("cart_items_user_id_variant_id_key").on(table.userId, table.variantId),
	unique("cart_items_session_id_variant_id_key").on(table.sessionId, table.variantId),
	pgPolicy("Admins can manage all cart items", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Guests can manage cart with session", { as: "permissive", for: "all", to: ["public"] }),
	pgPolicy("Users can delete own cart items", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can update own cart items", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can insert own cart items", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own cart items", { as: "permissive", for: "select", to: ["public"] }),
	check("cart_items_quantity_check", sql`quantity > 0`),
]);

export const wishlistItems = pgTable("wishlist_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "wishlist_items_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlist_items_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "wishlist_items_variant_id_fkey"
		}).onDelete("cascade"),
	unique("wishlist_items_user_id_variant_id_key").on(table.userId, table.variantId),
	pgPolicy("Admins can manage all wishlist items", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can delete own wishlist items", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can insert own wishlist items", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own wishlist items", { as: "permissive", for: "select", to: ["public"] }),
]);

export const productImages = pgTable("product_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	url: text().notNull(),
	altText: text("alt_text"),
	sortOrder: integer("sort_order").default(0),
	isPrimary: boolean("is_primary").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("product_images_one_primary_per_product").using("btree", table.productId.asc().nullsLast().op("uuid_ops")).where(sql`(is_primary = true)`),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_images_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "product_images_variant_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Anyone can view product images", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Admins can manage product images", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	shortDescription: text("short_description"),
	sku: text(),
	categoryId: uuid("category_id"),
	brandId: uuid("brand_id"),
	gender: productGender().default('unisex'),
	material: text(),
	careInstructions: text("care_instructions"),
	weight: numeric({ precision: 8, scale:  2 }),
	dimensions: jsonb(),
	basePrice: numeric("base_price", { precision: 10, scale:  2 }).notNull(),
	compareAtPrice: numeric("compare_at_price", { precision: 10, scale:  2 }),
	isActive: boolean("is_active").default(true),
	isFeatured: boolean("is_featured").default(false),
	isDigital: boolean("is_digital").default(false),
	requiresShipping: boolean("requires_shipping").default(true),
	trackInventory: boolean("track_inventory").default(true),
	allowBackorder: boolean("allow_backorder").default(false),
	minOrderQuantity: integer("min_order_quantity").default(1),
	maxOrderQuantity: integer("max_order_quantity"),
	metaTitle: text("meta_title"),
	metaDescription: text("meta_description"),
	tags: text().array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	stockQuantity: integer("stock_quantity").default(0),
	lowStockThreshold: integer("low_stock_threshold").default(10),
}, (table) => [
	index("idx_products_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	index("idx_products_brand").using("btree", table.brandId.asc().nullsLast().op("uuid_ops")),
	index("idx_products_category").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_products_featured").using("btree", table.isFeatured.asc().nullsLast().op("bool_ops")).where(sql`(is_featured = true)`),
	index("idx_products_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	index("idx_products_name").using("gin", sql`to_tsvector('english'::regconfig, name)`),
	index("idx_products_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("idx_products_stock_quantity").using("btree", table.stockQuantity.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_fkey"
		}),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [brands.id],
			name: "products_brand_id_fkey"
		}),
	unique("products_slug_key").on(table.slug),
	unique("products_sku_key").on(table.sku),
	pgPolicy("Authenticated users can view all products", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Anyone can view active products", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can manage products", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	parentId: uuid("parent_id"),
	imageUrl: text("image_url"),
	sortOrder: integer("sort_order").default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_categories_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_fkey"
		}),
	unique("categories_name_key").on(table.name),
	unique("categories_slug_key").on(table.slug),
	pgPolicy("Anyone can view active categories", { as: "permissive", for: "select", to: ["public"], using: sql`(is_active = true)` }),
	pgPolicy("Admins can manage categories", { as: "permissive", for: "all", to: ["authenticated"] }),
	pgPolicy("Authenticated users can view all categories", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const brands = pgTable("brands", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	logoUrl: text("logo_url"),
	websiteUrl: text("website_url"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_brands_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	unique("brands_name_key").on(table.name),
	unique("brands_slug_key").on(table.slug),
	pgPolicy("Authenticated users can view all brands", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Anyone can view active brands", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can manage brands", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const productVariants = pgTable("product_variants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	sku: text(),
	name: text(),
	size: text(),
	color: text(),
	colorCode: text("color_code"),
	material: text(),
	weight: numeric({ precision: 8, scale:  2 }),
	price: numeric({ precision: 10, scale:  2 }),
	compareAtPrice: numeric("compare_at_price", { precision: 10, scale:  2 }),
	barcode: text(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	stock: integer().default(0).notNull(),
	reservedStock: integer("reserved_stock").default(0).notNull(),
}, (table) => [
	index("idx_product_variants_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_variants_product_id_fkey"
		}).onDelete("cascade"),
	unique("product_variants_sku_key").on(table.sku),
	pgPolicy("Authenticated users can view all product variants", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Anyone can view active product variants", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Admins can manage product variants", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const guestSessions = pgTable("guest_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	auth0Id: text("auth0_id"),
	email: text().notNull(),
	password: text(),
	name: text(),
	phone: text(),
	avatar: text(),
	role: text().default('USER').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_auth0_id_key").on(table.auth0Id),
	unique("users_email_key").on(table.email),
]);

export const addresses = pgTable("addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	address: text().notNull(),
	district: text().notNull(),
	upazila: text().notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "addresses_user_id_fkey"
		}).onDelete("cascade"),
]);

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	dateOfBirth: date("date_of_birth"),
	gender: userGender(),
	avatarUrl: text("avatar_url"),
	preferences: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "profiles_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admins can manage all profiles", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can update own profile", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Allow profile creation for authenticated users", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can insert own profile", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own profile", { as: "permissive", for: "select", to: ["public"] }),
]);

export const userAddresses = pgTable("user_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	type: addressType().default('shipping'),
	isDefault: boolean("is_default").default(false),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	company: text(),
	addressLine1: text("address_line_1").notNull(),
	addressLine2: text("address_line_2"),
	city: text().notNull(),
	state: text().notNull(),
	postalCode: text("postal_code").notNull(),
	country: text().default('US').notNull(),
	phone: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "user_addresses_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admins can manage all addresses", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can delete own addresses", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Users can update own addresses", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can insert own addresses", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own addresses", { as: "permissive", for: "select", to: ["public"] }),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id"),
	paymentMethod: paymentMethod("payment_method").notNull(),
	paymentIntentId: text("payment_intent_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('USD'),
	status: text().default('pending'),
	gatewayResponse: jsonb("gateway_response"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payments_order_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admins can manage all payments", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can view own payments", { as: "permissive", for: "select", to: ["public"] }),
	check("payments_status_check", sql`status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text])`),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderNumber: text("order_number").notNull(),
	userId: uuid("user_id"),
	email: text(),
	phone: text(),
	subtotal: numeric({ precision: 10, scale:  2 }).notNull(),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }).default('0'),
	shippingAmount: numeric("shipping_amount", { precision: 10, scale:  2 }).default('0'),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).default('0'),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	status: orderStatus().default('pending'),
	paymentStatus: paymentStatus("payment_status").default('pending'),
	fulfillmentStatus: fulfillmentStatus("fulfillment_status").default('unfulfilled'),
	shippingMethodId: uuid("shipping_method_id"),
	trackingNumber: text("tracking_number"),
	estimatedDeliveryDate: date("estimated_delivery_date"),
	billingAddress: jsonb("billing_address").notNull(),
	shippingAddress: jsonb("shipping_address").notNull(),
	notes: text(),
	internalNotes: text("internal_notes"),
	source: text().default('web'),
	sessionId: text("session_id"),
	guestToken: text("guest_token"),
	guestTokenExpires: timestamp("guest_token_expires", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	paymentMethod: text("payment_method").default('cash').notNull(),
	shippingName: text("shipping_name"),
	shippingPhone: text("shipping_phone"),
	shippingEmail: text("shipping_email"),
	shippingDistrict: text("shipping_district"),
	shippingUpazila: text("shipping_upazila"),
}, (table) => [
	index("idx_orders_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_orders_guest_token").using("btree", table.guestToken.asc().nullsLast().op("text_ops")),
	index("idx_orders_number").using("btree", table.orderNumber.asc().nullsLast().op("text_ops")),
	index("idx_orders_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_orders_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_orders_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "orders_user_id_fkey"
		}),
	unique("orders_order_number_key").on(table.orderNumber),
	pgPolicy("Admins can manage all orders", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can view own orders", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id"),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	productName: text("product_name").notNull(),
	variantName: text("variant_name"),
	sku: text(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "order_items_variant_id_fkey"
		}),
	pgPolicy("Admins can manage all order items", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Users can view own order items", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("order_items_quantity_check", sql`quantity > 0`),
]);

export const inventoryMovements = pgTable("inventory_movements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	variantId: uuid("variant_id"),
	movementType: movementType("movement_type").notNull(),
	reason: movementReason().notNull(),
	quantity: integer().notNull(),
	previousQuantity: integer("previous_quantity").notNull(),
	newQuantity: integer("new_quantity").notNull(),
	reservedQuantity: integer("reserved_quantity").default(0),
	location: text().default('main'),
	orderId: uuid("order_id"),
	orderItemId: uuid("order_item_id"),
	userId: uuid("user_id"),
	referenceNumber: text("reference_number"),
	notes: text(),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  2 }),
	totalCost: numeric("total_cost", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_inventory_movements_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_inventory_movements_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_inventory_movements_type").using("btree", table.movementType.asc().nullsLast().op("enum_ops")),
	index("idx_inventory_movements_variant").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "inventory_movements_variant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "inventory_movements_order_id_fkey"
		}),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "inventory_movements_order_item_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "inventory_movements_user_id_fkey"
		}),
	pgPolicy("Admins can manage inventory movements", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const metaCapiSent = pgTable("meta_capi_sent", {
	orderId: uuid("order_id").primaryKey().notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "meta_capi_sent_order_id_fkey"
		}).onDelete("cascade"),
]);

export const inventory = pgTable("inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	variantId: uuid("variant_id"),
	location: text().default('main'),
	quantity: integer().default(0).notNull(),
	reservedQuantity: integer("reserved_quantity").default(0),
	availableQuantity: integer("available_quantity").generatedAlwaysAs(sql`(quantity - reserved_quantity)`),
	reorderPoint: integer("reorder_point").default(0),
	reorderQuantity: integer("reorder_quantity").default(0),
	lastCountedAt: timestamp("last_counted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_inventory_available").using("btree", table.availableQuantity.asc().nullsLast().op("int4_ops")),
	index("idx_inventory_variant").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "inventory_variant_id_fkey"
		}).onDelete("cascade"),
	unique("inventory_variant_location_unique").on(table.variantId, table.location),
	pgPolicy("Anyone can view inventory", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Admins can manage inventory", { as: "permissive", for: "all", to: ["authenticated"] }),
]);
