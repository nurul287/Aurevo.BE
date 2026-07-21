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
- Sequential order numbers (`ORD-` + 12-digit zero-padded sequence)
- Order confirmation email (Resend) with PDF invoice attached
- Download invoice PDF from the order-confirmation page (guest token or owner/admin)
- Track parcel status by Steadfast tracking code on the public `/tracking` page
- Cancel pending orders

**Authentication**
- Sign up / sign in via email+password
- OAuth (Google, etc.) via Supabase Auth
- Password reset via email
- JWT session auto-refresh

**Profile & Addresses**
- View and update profile (name, phone, date of birth, gender, avatar)
- Save multiple billing/shipping addresses in Bangladesh checkout shape (`name`, `phone`, `address`, `district`, `upazila`, optional `label`)
- Set a default address per type; reuse saved addresses at checkout without remapping fields

**AI Shopping Assistant**
- Full RAG chatbot (Claude + Voyage AI embeddings + pgvector) — full architecture in [`09-ai-chatbot-rag.md`](09-ai-chatbot-rag.md)
- Semantic search over products, shipping/returns/sizing/payment policies, and FAQs (`kb_chunks`)
- Logged-in customers can ask about their own orders (auth-gated tool, never offered to guests)
- True token streaming (SSE), multi-turn conversation history with retention/cleanup
- Storefront widget (`ai-chat-widget.tsx`) — the earlier Messenger deep-link button was removed in favor of this

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
- Book a Steadfast courier consignment (explicit admin action — never automatic)
- Refresh courier status; view tracking timeline on the order detail page
- Add tracking number / estimated delivery (manual fallback when courier is unset)
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
| **Rate Limiting** | Tiered limits: 100/15min public, 20/15min auth (login/register), 60/min cart writes, 30/min public tracking lookups, 10/min AI chat, 20/min uploads, 5/min sensitive writes |
| **Error Handling** | Global typed error hierarchy (NotFoundError, ValidationError, etc.); no stack traces leaked to clients |
| **Data Integrity** | Stock changes run in DB transactions; FK constraints enforced at DB level |
| **Testability** | Integration tests against real local DB; no mocked data layer; tests run sequentially to avoid FK conflicts |
| **Developer Experience** | TypeScript strict mode throughout; Swagger docs auto-generated from JSDoc; micro-commits per feature |

---

## Out of Scope (for this portfolio build)

- Real payment processing (Stripe/PayPal) — payment method stored as string, gateway integration deferred
- Shipping-status email/SMS notifications (order confirmation with invoice PDF is sent; courier status updates are reflected in-app and on `/tracking`, not pushed as emails)
- Product reviews — table exists in DB, API module not built yet
- Wishlists — table exists in DB, API module not built yet
- Real-time inventory sync — polling-based for now
- Mobile app
- Separate staging environment — see Decisions Log below

---

## Decisions Log

- **i18n was implemented**, not deferred (originally listed under Out of Scope). English/বাংলা via i18next; English is the default for every visitor, Bangla is opt-in via a header toggle and persists per user. No location/timezone-based auto-switching — an earlier version defaulted to Bangla for Asia/Dhaka timezones, but this was deliberately removed in favor of an explicit, predictable default.
- **No dedicated staging Supabase project.** Considered and rejected — the two-environment model (local Docker Supabase for dev/test, one production Supabase) is what the team can afford to operate. CI already runs every migration against a fresh, disposable local Postgres and the full test suite before anything reaches `main`, which covers most of what a staging environment would catch for schema/logic bugs. The gap this leaves: no free-tier backups on production Supabase — a real data-loss incident (not a schema bug) has no undo today. Upgrading to Supabase Pro (daily backups) is the recommended next step once real order volume makes the data irreplaceable.
- **Order confirmation email ships via Resend**, sending from `orders@aurevofashion.store`. An earlier version used Gmail SMTP as a zero-cost stopgap before the team owned a domain (Resend/Brevo/SendGrid all need a verified sending domain to email arbitrary customer addresses, which a personal Gmail account can't provide). Once `aurevofashion.store` was purchased and DNS-verified with Resend (SPF/DKIM records via Vercel DNS), the team switched to Resend to drop Gmail's 500/day cap and get real transactional-email deliverability infrastructure. The confirmation email attaches a freshly generated PDF invoice; if PDF generation fails, the email still sends without the attachment (customers can download from the confirmation page).
- **Invoice PDFs are generated on demand with `pdfkit`**, never persisted to disk or object storage. Regenerated on every email send and every `GET /orders/by-number/:orderNumber/invoice` request so payment status and line items stay current. Uses a bundled Noto Sans Bengali static TTF (not the variable font — fontkit corrupts variable-font glyphs) because shipping names/addresses may be Bangla, and draws the Aurevo wordmark as vector SVG via `svg-to-pdfkit`. Order numbers are fixed-width (`ORD-` + 12 digits from `order_number_seq`) so the invoice layout stays stable under concurrency.
- **Courier integration uses Steadfast** (Bangladesh). Consignment booking is an explicit admin action only (`POST /courier/orders/:id/ship`) — never automatic — because booking commits real COD/delivery-charge money and Steadfast has no cancel-consignment endpoint. Status updates arrive via a Bearer-token-guarded webhook (`POST /courier/webhook`) with a reconciliation poll (`POST /internal/courier/poll`) as a safety net for missed webhooks. Public tracking (`GET /courier/track/:trackingCode`) returns status + event timeline with no recipient PII.
- **AI chat rebuilt as a full RAG pipeline** (previously a bare Anthropic tool-use bot with no retrieval, no persistence, and no real streaming). Voyage AI embeddings + pgvector (`kb_chunks`) power semantic search over products and a small set of policy/FAQ markdown docs (`content/policies/`); Anthropic's real `stream: true` API replaces the earlier simulated-streaming loop. Auto-embedding on product create/update/delete is a lightweight fire-and-forget hook, not full CDC — deliberately, given the catalog's current small scale (see Backlog for the CDC follow-up if that changes). Conversation history persists per `sessionId` with a 90-day retention window for logged-in users and 48 hours for guests, cleaned up by a secret-gated internal route (`POST /internal/chat/cleanup`) triggered by a daily Railway cron — no new job-runner infra. The order-lookup tool is only ever offered to the model on an authenticated request, enforced in code (not just prompted), so a guest session or a prompt-injection attempt has no path to another customer's order data.
- **Full authentication + checkout E2E testing was implemented**, not deferred. Playwright specs in `Aurevo.UI/e2e/` cover login (valid/invalid credentials), logout (session revocation verified against a protected route), the full password-reset loop (request → real email via Inbucket → follow the link → set new password → log in with it, plus the expired/invalid-link state), guest checkout, and logged-in checkout with a saved address.
- **The go-live checklist was executed.** The site is live in production — Aurevo.UI on Vercel at `aurevofashion.store`, Aurevo.BE on Railway at `api-aurevofashion.up.railway.app` — serving real customer orders, with Sentry error tracking, structured pino logs, and the deep `/api/health` check already covering the "monitor system health" half of this item.

---

## Backlog

- Load testing — design doc parked at [`08-load-testing-plan.md`](08-load-testing-plan.md) (k6, full user journey, production safeguards); not started
- Role-based access control — additional roles beyond admin/user (order management role, product management role)
- Security audit
- Bulk data processing pipeline
- Payment gateway integration
- CDC/delta indexing for the RAG knowledge base — current auto-embed hook re-embeds one product per mutation, which is fine at today's catalog size but doesn't scale to high write volume; revisit if that changes
- Self-service "clear my chat history" action for logged-in users (currently only the 90-day automatic retention window applies)
- Clean up messy product title data in the catalog (e.g. stray `{shoe1:1}`-style annotations, glued-on `"1.1"` version suffixes, inconsistent spacing) — currently worked around in the chat product-card matching logic (`chat.service.ts`) rather than fixed at the source
- Convert the storefront to React Native — planned once the web implementation (Aurevo.UI) is feature-complete; not started
- RAG chatbot improvements — remaining sessions of the improvement roadmap (see [`09-ai-chatbot-rag.md`](09-ai-chatbot-rag.md) "Planned Improvements"). Sessions A (eval harness), B (hybrid search), and C (re-ranking) are **built** — hybrid + `hybrid+rerank` are opt-in via `retrieve()`'s `opts.mode`, with vector still the eval-gated default (the rerank eval/default-flip is blocked on upgrading the free-tier Voyage key). The RAG monitoring dashboard is fully built — backend (Session E: `chat_metrics` capture + `GET /admin/ai-metrics` + cleanup retention) and frontend (Session F: the `/admin/ai` recharts admin page). The only remaining roadmap item is **eval-driven retrieval tuning** (chunk-text cleanup + prompt tuning + embedding-model A/B), which is deferred: the retrieval eval is saturated at the current KB size and full measurement is blocked on upgrading the free-tier Voyage key
