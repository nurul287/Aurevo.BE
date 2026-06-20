# Phase 1 — Requirements

## Project Brief

Aurevo Fashion is a portfolio e-commerce project designed to demonstrate full-stack engineering capability across the complete software development lifecycle. It simulates a real-world fashion retail platform — not a toy app.

**Goal:** Build a fully functional, production-patterned e-commerce system that a hiring panel or technical reviewer can inspect at every layer.

---

## User Roles

| Role | Description |
|------|-------------|
| **Guest** | Unregistered visitor — can browse products, add to cart via session ID, place orders with email |
| **Customer** | Registered user — everything a guest can do, plus saved cart, order history, address book, profile |
| **Admin** | Store operator — manages products, inventory, orders, users; sees analytics |

---

## Functional Requirements

### Storefront (Customer-facing)

**Product Discovery**
- Browse products with filters: category, brand, gender, price range, search
- View product detail with all variants (size, color, SKU), images, stock level
- See featured products on homepage
- Browse by category or brand

**Cart**
- Add/remove/update items as guest (session-based) or logged-in user
- Cart persists across browser sessions (localStorage session ID for guests)
- Guest cart migrates to user account on sign-in (merges quantities for duplicate variants)

**Checkout & Orders**
- Place orders as guest (email + address required) or as authenticated user
- Stock validation at order time — cannot order more than available
- Order confirmation with order number
- Track order status (pending → confirmed → processing → shipped → delivered)
- Cancel pending orders

**Authentication**
- Sign up / sign in via email+password
- OAuth (Google, etc.) via Supabase Auth
- Password reset via email
- JWT session auto-refresh

**Profile & Addresses**
- View and update profile (name, phone, date of birth, gender, avatar)
- Save multiple billing/shipping addresses
- Set a default address per type

**AI Shopping Assistant**
- Chat interface powered by Claude
- Searches real product catalog via tool use
- Streaming responses (SSE)

### Admin Panel

**Products**
- Create/edit/delete products with full metadata (SEO, pricing, dimensions)
- Manage product variants (size, color, price, SKU, barcode)
- Upload/manage product images (primary image auto-selection)
- Bulk activate/deactivate, bulk delete

**Inventory**
- View per-variant stock levels
- Adjust stock with reason tracking (restock, damage, theft, etc.)
- Full audit log of every inventory movement
- Low-stock alerts

**Orders**
- View all orders with filters (status, date, user)
- Update order status, payment status, fulfillment status
- Add tracking number, estimated delivery
- Cancel any order (admins can cancel at any non-delivered stage)

**Dashboard**
- Total orders, revenue, customers, products at a glance
- Low-stock / out-of-stock counts
- Recent orders

---

## Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| **Security** | JWT auth on all protected routes; Helmet headers; CORS locked to frontend origin; RLS on Supabase tables |
| **Validation** | All API inputs validated with Zod schemas; errors returned in a consistent machine-readable format |
| **Rate Limiting** | Tiered limits: 100/15min public, 20/15min auth, 10/min AI chat, 20/min uploads |
| **Error Handling** | Global typed error hierarchy (NotFoundError, ValidationError, etc.); no stack traces leaked to clients |
| **Data Integrity** | Stock changes run in DB transactions; FK constraints enforced at DB level |
| **Testability** | Integration tests against real local DB; no mocked data layer; tests run sequentially to avoid FK conflicts |
| **Developer Experience** | TypeScript strict mode throughout; Swagger docs auto-generated from JSDoc; micro-commits per feature |

---

## Out of Scope (for this portfolio build)

- Real payment processing (Stripe/PayPal) — payment method stored as string, gateway integration deferred
- Email notifications (order confirmation, shipping) — deferred
- Product reviews — table exists in DB, API module not built yet
- Wishlists — table exists in DB, API module not built yet
- Real-time inventory sync — polling-based for now
- Multi-language / i18n
- Mobile app
