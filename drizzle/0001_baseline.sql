CREATE TYPE "public"."address_type" AS ENUM('billing', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('unfulfilled', 'partial', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('pending', 'running', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('pending', 'processing', 'done', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."kb_source_type" AS ENUM('product', 'policy', 'faq');--> statement-breakpoint
CREATE TYPE "public"."movement_reason" AS ENUM('purchase_order', 'customer_order', 'checkout_reserve', 'payment_failed', 'order_cancelled', 'customer_return', 'damaged_goods', 'inventory_count', 'theft_loss', 'location_transfer', 'manual_adjustment');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('restock', 'sale', 'reserve', 'unreserve', 'cancel', 'return', 'adjustment', 'damage', 'theft', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'online');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."product_gender" AS ENUM('men', 'women', 'unisex');--> statement-breakpoint
CREATE TYPE "public"."user_gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"website_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "brands_name_key" UNIQUE("name"),
	CONSTRAINT "brands_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"product_id" uuid,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cart_items_user_id_variant_id_key" UNIQUE("user_id","variant_id"),
	CONSTRAINT "cart_items_session_id_variant_id_key" UNIQUE("session_id","variant_id"),
	CONSTRAINT "cart_items_quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "categories_name_key" UNIQUE("name"),
	CONSTRAINT "categories_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"model" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"retrieval_latency_ms" integer,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"tool_calls" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retrieval_result_count" integer,
	"retrieval_top_score" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" uuid NOT NULL,
	"intent_summary" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "courier_tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'steadfast' NOT NULL,
	"status" text,
	"message" text,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courier_tracking_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"status" "import_job_status" DEFAULT 'pending' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"succeeded" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "import_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "import_row_status" DEFAULT 'pending' NOT NULL,
	"product_id" uuid,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_rows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"location" text DEFAULT 'main',
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0,
	"available_quantity" integer GENERATED ALWAYS AS ((quantity - reserved_quantity)) STORED,
	"reorder_point" integer DEFAULT 0,
	"reorder_quantity" integer DEFAULT 0,
	"last_counted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "inventory_variant_location_unique" UNIQUE("variant_id","location")
);
--> statement-breakpoint
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"movement_type" "movement_type" NOT NULL,
	"reason" "movement_reason" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"reserved_quantity" integer DEFAULT 0,
	"location" text DEFAULT 'main',
	"order_id" uuid,
	"order_item_id" uuid,
	"user_id" uuid,
	"reference_number" text,
	"notes" text,
	"cost_per_unit" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "kb_source_type" NOT NULL,
	"source_id" text,
	"title" text,
	"content" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fts" "tsvector" GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || content))) STORED
);
--> statement-breakpoint
ALTER TABLE "kb_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meta_capi_sent" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meta_capi_sent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"product_name" text NOT NULL,
	"variant_name" text,
	"sku" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "order_items_quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"email" text,
	"phone" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT 0,
	"shipping_amount" numeric(10, 2) DEFAULT 0,
	"discount_amount" numeric(10, 2) DEFAULT 0,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pending',
	"payment_status" "payment_status" DEFAULT 'pending',
	"fulfillment_status" "fulfillment_status" DEFAULT 'unfulfilled',
	"shipping_method_id" uuid,
	"tracking_number" text,
	"estimated_delivery_date" date,
	"billing_address" jsonb NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"notes" text,
	"internal_notes" text,
	"source" text DEFAULT 'web',
	"session_id" text,
	"guest_token" text,
	"guest_token_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"shipping_name" text,
	"shipping_phone" text,
	"shipping_email" text,
	"shipping_district" text,
	"shipping_upazila" text,
	"courier_provider" text,
	"courier_consignment_id" bigint,
	"courier_status" text,
	"courier_status_updated_at" timestamp with time zone,
	CONSTRAINT "orders_order_number_key" UNIQUE("order_number")
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"payment_method" "payment_method" NOT NULL,
	"payment_intent_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"status" text DEFAULT 'pending',
	"gateway_response" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payments_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"url" text NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"user_id" uuid,
	"order_id" uuid,
	"rating" integer NOT NULL,
	"title" text,
	"content" text,
	"is_verified_purchase" boolean DEFAULT false,
	"is_approved" boolean DEFAULT false,
	"helpful_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "product_reviews_product_id_user_id_order_id_key" UNIQUE("product_id","user_id","order_id"),
	CONSTRAINT "product_reviews_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"sku" text,
	"name" text,
	"size" text,
	"color" text,
	"color_code" text,
	"material" text,
	"weight" numeric(8, 2),
	"price" numeric(10, 2),
	"compare_at_price" numeric(10, 2),
	"barcode" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved_stock" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_variants_sku_key" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"short_description" text,
	"sku" text,
	"category_id" uuid,
	"brand_id" uuid,
	"gender" "product_gender" DEFAULT 'unisex',
	"material" text,
	"care_instructions" text,
	"weight" numeric(8, 2),
	"dimensions" jsonb,
	"base_price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"is_digital" boolean DEFAULT false,
	"requires_shipping" boolean DEFAULT true,
	"track_inventory" boolean DEFAULT true,
	"allow_backorder" boolean DEFAULT false,
	"min_order_quantity" integer DEFAULT 1,
	"max_order_quantity" integer,
	"meta_title" text,
	"meta_description" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"stock_quantity" integer DEFAULT 0,
	"low_stock_threshold" integer DEFAULT 10,
	"external_id" text,
	"source" text,
	CONSTRAINT "products_slug_key" UNIQUE("slug"),
	CONSTRAINT "products_sku_key" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"date_of_birth" date,
	"gender" "user_gender",
	"avatar_url" text,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "address_type" DEFAULT 'shipping',
	"is_default" boolean DEFAULT false,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"label" text,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"district" text NOT NULL,
	"upazila" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "wishlist_items_user_id_variant_id_key" UNIQUE("user_id","variant_id")
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_metrics" ADD CONSTRAINT "chat_metrics_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_tracking_events" ADD CONSTRAINT "courier_tracking_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_capi_sent" ADD CONSTRAINT "meta_capi_sent_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_brands_is_active" ON "brands" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_cart_items_session" ON "cart_items" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cart_items_user" ON "cart_items" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_categories_is_active" ON "categories" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_chat_metrics_created" ON "chat_metrics" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_conversations_last_activity" ON "conversations" USING btree ("last_activity_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_conversations_session" ON "conversations" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_conversations_user" ON "conversations" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_courier_events_order" ON "courier_tracking_events" USING btree ("order_id" uuid_ops,"event_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_import_rows_job" ON "import_rows" USING btree ("job_id" uuid_ops,"status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_import_rows_job_external" ON "import_rows" USING btree ("job_id" uuid_ops,"source" text_ops,"external_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_available" ON "inventory" USING btree ("available_quantity" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_variant" ON "inventory" USING btree ("variant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_created" ON "inventory_movements" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_order" ON "inventory_movements" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_type" ON "inventory_movements" USING btree ("movement_type" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_variant" ON "inventory_movements" USING btree ("variant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_kb_chunks_embedding" ON "kb_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_kb_chunks_fts" ON "kb_chunks" USING gin ("fts" tsvector_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_kb_chunks_product_source" ON "kb_chunks" USING btree ("source_id" text_ops) WHERE (source_type = 'product'::kb_source_type);--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_courier_consignment" ON "orders" USING btree ("courier_consignment_id") WHERE (courier_consignment_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_guest_token" ON "orders" USING btree ("guest_token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_number" ON "orders" USING btree ("order_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_session" ON "orders" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_user" ON "orders" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_one_primary_per_product" ON "product_images" USING btree ("product_id" uuid_ops) WHERE (is_primary = true);--> statement-breakpoint
CREATE INDEX "idx_reviews_approved" ON "product_reviews" USING btree ("is_approved" bool_ops) WHERE (is_approved = true);--> statement-breakpoint
CREATE INDEX "idx_reviews_product" ON "product_reviews" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_user" ON "product_reviews" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_product_variants_is_active" ON "product_variants" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_products_active" ON "products" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_products_brand" ON "products" USING btree ("brand_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_featured" ON "products" USING btree ("is_featured" bool_ops) WHERE (is_featured = true);--> statement-breakpoint
CREATE INDEX "idx_products_is_active" ON "products" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING gin (to_tsvector('english'::regconfig, name));--> statement-breakpoint
CREATE INDEX "idx_products_slug" ON "products" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "idx_products_stock_quantity" ON "products" USING btree ("stock_quantity" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_source_external" ON "products" USING btree ("source" text_ops,"external_id" text_ops) WHERE (source IS NOT NULL) AND (external_id IS NOT NULL);--> statement-breakpoint
CREATE POLICY "Authenticated users can view all brands" ON "brands" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Anyone can view active brands" ON "brands" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can manage brands" ON "brands" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Admins can manage all cart items" ON "cart_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Guests can manage cart with session" ON "cart_items" AS PERMISSIVE FOR ALL TO public USING (((auth.uid() IS NULL) AND (session_id IS NOT NULL)) OR (auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "Users can delete own cart items" ON "cart_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can update own cart items" ON "cart_items" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can insert own cart items" ON "cart_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can view own cart items" ON "cart_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Anyone can view active categories" ON "categories" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can manage categories" ON "categories" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Authenticated users can view all categories" ON "categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Anyone can view inventory" ON "inventory" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Admins can manage inventory" ON "inventory" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Admins can manage inventory movements" ON "inventory_movements" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Admins can manage all order items" ON "order_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can view own order items" ON "order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "Admins can manage all orders" ON "orders" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can view own orders" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Admins can manage all payments" ON "payments" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can view own payments" ON "payments" AS PERMISSIVE FOR SELECT TO public USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "Anyone can view product images" ON "product_images" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Admins can manage product images" ON "product_images" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Admins can manage all reviews" ON "product_reviews" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can delete own reviews" ON "product_reviews" AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id) AND (is_approved = false));--> statement-breakpoint
CREATE POLICY "Users can update own reviews" ON "product_reviews" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id) AND (is_approved = false)) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can insert own reviews" ON "product_reviews" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can view own reviews" ON "product_reviews" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Anyone can view approved reviews" ON "product_reviews" AS PERMISSIVE FOR SELECT TO public USING (is_approved = true);--> statement-breakpoint
CREATE POLICY "Authenticated users can view all product variants" ON "product_variants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Anyone can view active product variants" ON "product_variants" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can manage product variants" ON "product_variants" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Authenticated users can view all products" ON "products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Anyone can view active products" ON "products" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));--> statement-breakpoint
CREATE POLICY "Admins can manage products" ON "products" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Admins can manage all profiles" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can update own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "Allow profile creation for authenticated users" ON "profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "Users can insert own profile" ON "profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "Users can view own profile" ON "profiles" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "Admins can manage all addresses" ON "user_addresses" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can delete own addresses" ON "user_addresses" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can update own addresses" ON "user_addresses" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can insert own addresses" ON "user_addresses" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can view own addresses" ON "user_addresses" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Admins can manage all wishlist items" ON "wishlist_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());--> statement-breakpoint
CREATE POLICY "Users can delete own wishlist items" ON "wishlist_items" AS PERMISSIVE FOR DELETE TO public USING (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can insert own wishlist items" ON "wishlist_items" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
CREATE POLICY "Users can view own wishlist items" ON "wishlist_items" AS PERMISSIVE FOR SELECT TO public USING (auth.uid() = user_id);