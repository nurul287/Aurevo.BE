# Phase 3 — Database Design

## Overview

- **Database:** PostgreSQL 15 (via Supabase)
- **Tables:** 19
- **Enums:** 9
- **Schema managed by:** Supabase migrations (source of truth)
- **ORM mapping:** Generated via `drizzle-kit introspect`

---

## Enums

| Enum | Values |
|------|--------|
| `address_type` | `billing`, `shipping` |
| `fulfillment_status` | `unfulfilled`, `partial`, `fulfilled` |
| `movement_reason` | `purchase_order`, `customer_order`, `checkout_reserve`, `payment_failed`, `order_cancelled`, `customer_return`, `damaged_goods`, `inventory_count`, `theft_loss`, `location_transfer`, `manual_adjustment` |
| `movement_type` | `restock`, `sale`, `reserve`, `unreserve`, `cancel`, `return`, `adjustment`, `damage`, `theft`, `transfer` |
| `order_status` | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `payment_method` | `cash`, `online` |
| `payment_status` | `pending`, `paid`, `failed`, `refunded`, `partially_refunded` |
| `product_gender` | `men`, `women`, `unisex` |
| `user_gender` | `male`, `female`, `other` |

---

## Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    └──── profiles (1:1, id FK → auth.users.id)
               │
               ├──── user_addresses (many)
               ├──── cart_items (many, user_id)
               ├──── orders (many, user_id)
               ├──── product_reviews (many)
               ├──── wishlist_items (many)
               └──── inventory_movements (many, user_id = actor)

categories (self-referencing via parent_id)
    │
    └──── products (many)
               │
               ├──── product_variants (many)
               │         │
               │         ├──── cart_items (many, variant_id)
               │         ├──── order_items (many, variant_id)
               │         ├──── inventory (1:1, variant_id)
               │         ├──── inventory_movements (many)
               │         ├──── product_images (many, variant_id optional)
               │         └──── wishlist_items (many)
               │
               └──── product_images (many, product-level)

brands
    └──── products (many)

orders
    ├──── order_items (many)
    ├──── payments (1:many)
    └──── product_reviews (many, order_id for verified purchase)

guest_sessions
    └──── (cart_items reference session_id as text, not FK — intentional for flexibility)
```

---

## Table Reference

### `categories`
Hierarchical (self-referencing `parent_id`). Supports category trees for navigation.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | unique |
| slug | text | unique, URL-safe |
| description | text | |
| parent_id | uuid | FK → categories.id (self-ref, nullable) |
| image_url | text | |
| sort_order | integer | default 0 |
| is_active | boolean | default true |

---

### `brands`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | unique |
| slug | text | unique |
| description | text | |
| logo_url | text | |
| website_url | text | |
| is_active | boolean | default true |

---

### `products`
Core catalog table. Heavy indexing for storefront queries.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | GIN index for full-text search |
| slug | text | unique, btree index |
| description | text | |
| short_description | text | |
| sku | text | unique (product-level SKU) |
| category_id | uuid | FK → categories |
| brand_id | uuid | FK → brands |
| gender | product_gender enum | men/women/unisex |
| base_price | numeric(10,2) | |
| compare_at_price | numeric(10,2) | original price for "sale" display |
| is_active | boolean | partial index for active-only queries |
| is_featured | boolean | partial index |
| track_inventory | boolean | |
| allow_backorder | boolean | |
| min/max_order_quantity | integer | |
| meta_title, meta_description | text | SEO |
| tags | text[] | array |
| stock_quantity | integer | denormalized total (for fast listing queries) |
| low_stock_threshold | integer | default 10 |

---

### `product_variants`
Each product has one or more variants (e.g., Red / Large). Stock is tracked at variant level.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | uuid | FK → products (cascade delete) |
| sku | text | unique across all variants |
| name | text | e.g., "Red / XL" |
| size | text | |
| color | text | |
| color_code | text | hex code |
| price | numeric(10,2) | variant-specific price override |
| compare_at_price | numeric(10,2) | |
| is_active | boolean | |
| stock | integer | available units (not null, default 0) |
| reserved_stock | integer | units held by pending orders |

**Stock design:** `stock` = units physically available. `reserved_stock` = units held by pending orders not yet shipped. Effective available = `stock - reserved_stock`. When an order is placed: `stock -= qty, reserved_stock += qty`. When delivered: `reserved_stock -= qty`. When cancelled: `stock += qty, reserved_stock -= qty`.

---

### `product_images`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | uuid | FK → products (cascade) |
| variant_id | uuid | FK → product_variants (nullable — product-level images have no variant) |
| url | text | Supabase Storage public URL |
| alt_text | text | accessibility |
| sort_order | integer | |
| is_primary | boolean | unique partial index: only one primary per product |

**Constraint:** `uniqueIndex("product_images_one_primary_per_product")` — enforced at DB level, not just application logic.

---

### `profiles`
Extends `auth.users` in a 1:1 relationship. Supabase manages `auth.users`; `profiles` holds app-specific user data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → auth.users(id) — NOT a new UUID, reuses auth ID |
| first_name | text | |
| last_name | text | |
| phone | text | |
| date_of_birth | date | |
| gender | user_gender enum | |
| avatar_url | text | Supabase Storage URL |
| preferences | jsonb | default {} — extensible settings |

**Why 1:1 extension vs. columns on auth.users:** Supabase manages `auth.users` schema — we cannot add columns. Profiles table is the standard Supabase pattern for user metadata.

---

### `user_addresses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → profiles.id |
| type | address_type enum | billing or shipping |
| is_default | boolean | one default per type per user (enforced in app) |
| first_name, last_name | text | NOT NULL |
| address_line_1 | text | NOT NULL |
| city, state, postal_code | text | NOT NULL |
| country | text | default 'US' |
| company, address_line_2, phone | text | optional |

---

### `cart_items`
Dual-owner design — items belong to either a logged-in user OR a guest session.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → profiles.id (nullable) |
| session_id | text | guest identifier (nullable) |
| product_id | uuid | FK → products |
| variant_id | uuid | FK → product_variants |
| quantity | integer | check: > 0 |
| price | numeric(10,2) | price at time of add (snapshot) |

**Constraints:**
- `unique(user_id, variant_id)` — one row per variant per user
- `unique(session_id, variant_id)` — one row per variant per session
- Adding same variant again increments quantity (upsert pattern)

---

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_number | text | unique, format: `ORD-{timestamp}-{random}` |
| user_id | uuid | FK → profiles.id (nullable — guests allowed) |
| guest_email | text | for guest orders |
| guest_token | text | for guest order lookup |
| status | order_status enum | full lifecycle |
| payment_status | payment_status enum | |
| fulfillment_status | fulfillment_status enum | |
| subtotal, tax_amount, shipping_amount, discount_amount, total_amount | numeric(10,2) | |
| billing_address, shipping_address | jsonb | snapshot at time of order |
| notes | text | customer notes |
| internal_notes | text | admin notes (not shown to customer) |
| tracking_number | text | |
| estimated_delivery_date | date | |
| session_id | text | guest cart reference |

---

### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid | FK → orders (cascade) |
| product_id | uuid | FK → products |
| variant_id | uuid | FK → product_variants |
| quantity | integer | |
| unit_price, total_price | numeric(10,2) | snapshot at order time |
| product_name, variant_name | text | snapshot (product may change) |

**Why snapshot product name/price:** Products can be renamed or repriced. Order history must reflect what the customer actually paid for.

---

### `inventory`
One row per variant per location. Tracks physical stock levels separately from the `product_variants.stock` denormalized field.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| variant_id | uuid | FK → product_variants |
| location | text | default 'main' |
| quantity | integer | |
| reserved_quantity | integer | |
| available_quantity | integer | **generated column**: `quantity - reserved_quantity` |
| reorder_point | integer | trigger low-stock alert |
| reorder_quantity | integer | suggested restock amount |

**Generated column:** `available_quantity` is computed by PostgreSQL — never stored, always consistent.

---

### `inventory_movements`
Immutable audit log. Every stock change writes a row here.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| variant_id | uuid | FK → product_variants |
| movement_type | movement_type enum | restock/sale/reserve/etc. |
| reason | movement_reason enum | why the change happened |
| quantity_change | integer | positive = in, negative = out |
| quantity_before, quantity_after | integer | snapshot for audit |
| user_id | uuid | FK → profiles.id (who made the change) |
| order_id | uuid | FK → orders (if order-triggered) |
| notes | text | |

---

### `payments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| order_id | uuid | FK → orders (cascade) |
| payment_method | payment_method enum | cash or online |
| amount | numeric(10,2) | |
| status | text | check constraint: pending/succeeded/failed/cancelled/refunded |
| gateway_response | jsonb | raw payment gateway response |
| processed_at | timestamp | |

---

### Other Tables

| Table | Purpose |
|-------|---------|
| `product_reviews` | Customer reviews with rating (1-5), verified purchase check, approval flow |
| `wishlist_items` | User's saved products/variants |
| `guest_sessions` | Tracks guest session UUIDs with expiry |
| `users` | Legacy table (pre-Supabase Auth migration) — not used by the BE API |
| `addresses` | Legacy address table (pre-`user_addresses`) — not used by the BE API |

---

## Indexes

Key indexes on high-traffic query paths:

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| products | `idx_products_active` | btree partial | WHERE is_active = true |
| products | `idx_products_name` | GIN | Full-text search via `to_tsvector` |
| products | `idx_products_slug` | btree | Slug lookup |
| products | `idx_products_featured` | btree partial | Featured products |
| product_variants | `idx_product_variants_is_active` | btree partial | Active-only queries |
| cart_items | `idx_cart_items_user` | btree | User cart lookup |
| cart_items | `idx_cart_items_session` | btree | Guest cart lookup |
| product_reviews | `idx_reviews_product` | btree | Reviews by product |
| product_reviews | `idx_reviews_approved` | btree partial | Public-visible reviews |

---

## Row-Level Security

Every table has RLS policies. Key patterns:

- **Public read** — active products, categories, brands visible to all
- **Owner read/write** — users can only see/modify their own cart, orders, profile, addresses
- **Admin all** — `is_admin()` function grants full access to admins
- **Guest cart** — `session_id` based access without authentication

The Express BE connects via the **service role key** (bypasses RLS) and enforces access control in the application layer. The UI's direct Supabase calls go through the **anon key** and are governed by RLS.
