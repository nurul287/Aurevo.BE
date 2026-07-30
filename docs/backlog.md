# Backlog

Ideas that have been scoped enough to be worth revisiting, but haven't gone through
full brainstorming/design/planning yet. Not SDLC docs — see `docs/01-requirements.md`
through `docs/10-bulk-import-pipeline.md` for those.

---

## AI shopping assistant as a standalone service

**What:** Pull Aurevo's existing RAG chatbot (`src/app/modules/chat/`, `src/app/modules/knowledge/`)
out into its own standalone application — a real multi-tenant service that any
application (not just Aurevo) could integrate with over the network, not a shared
library each app wires in locally. Direction confirmed: **Option A** (see below).

**Why this is worth building:** the hard part is already solved and proven inside
Aurevo — hybrid search (pgvector + Postgres FTS + RRF fusion + Voyage rerank,
eval-gated), a real streaming tool-use loop against Claude, and non-trivial
product-card matching against messy catalog titles. Most small e-commerce sites
want "an AI assistant that knows our catalog" but can't build eval-gated retrieval
themselves.

**Current coupling (from reading `chat.service.ts` / `knowledge.service.ts` directly,
2026-07-29):**
- `get_product_details` tool queries Aurevo's own `products`/`productVariants`/
  `productImages` tables directly via Drizzle (`chat.service.ts:162-182`).
- `get_my_orders` calls Aurevo's `orders.service.ts` directly, trusting Aurevo's
  own auth-derived `userId`.
- The knowledge base (`kb_chunks`, pgvector) is populated by hooks fired *inside*
  `products.service.ts`'s create/update/delete — there's no ingestion API, just a
  local function call.
- Single-tenant schema throughout — no `tenant_id` anywhere, one Postgres, one set
  of API keys.
- System prompt hardcodes "Aurevo Fashion... Bangladesh" and BDT formatting.

**Already generic, reusable close to as-is:**
- The Anthropic streaming tool-use loop (`chat.service.ts:257-428`) — doesn't know
  anything Aurevo-specific beyond what's *in* the tools/prompt handed to it.
- `retrieve()`'s hybrid search algorithm — only assumes a `kb_chunks`-shaped table;
  it's the *ingestion side* that's Aurevo-specific, not the search itself.
- The product-card name-matching logic — assumes "thing with id/name/image/price,"
  not Aurevo specifically.

**Two extraction strategies were discussed; Option A was chosen:**
- **Option A (chosen) — real standalone multi-tenant service.** The service owns
  its own DB, exposes an ingestion API (host apps push their catalog in), and
  calls back into each host app for live stock/price and orders via two endpoints
  the host must implement, authenticated per tenant. Requires: multi-tenant auth,
  an ingestion API, a callback contract, a backfill migration off Aurevo's current
  hook-based ingestion, and an embeddable widget. Rough estimate for a solid v1:
  **1-2 weeks**.
- Option B (not chosen) — extract just the reusable code as a shared npm library,
  each app still owns its own DB/tools/auth locally. No network hop, no
  multi-tenancy. ~2-3 days, but not "any application over the network" — closer to
  "reusable in your next project."

**Status:** idea scoped via brainstorming on 2026-07-29, intentionally not
designed/planned yet. Pull this back into `/superpowers:brainstorming` (or
directly into `writing-plans`, since the scoping/options work above is already
done) when ready to actually build it — next steps from there: confirm the
callback-contract shape, decide where the service's own Postgres+pgvector lives,
and decide auth model for tenant API keys.

---

## Admin escape hatch for waiving or overriding shipping

**What:** An admin-only way to set a shipping charge that differs from the
district-derived rate — waiving delivery for a VIP, honouring a promotion, or
correcting a mis-keyed address after the fact.

**Why it's not there now:** shipping used to be taken verbatim from the request
body (`const shippingAmount = input.shippingAmount ?? 0`). Because `POST /orders`
is public for guest checkout, anyone could send `shippingAmount: 0` and get free
delivery — and with Cash on Delivery the courier collects `total_amount`, so the
shop absorbed the fee. That was closed on 2026-07-30 by deriving the charge
server-side from `shippingAddress.district` (`calculateShippingAmount` in
`orders.service.ts`, 100 inside Dhaka / 130 outside) and ignoring the client
value entirely.

Ignoring it is the right default, but it removed the only mechanism for a
legitimate override. There is currently no way to waive shipping at all.

**Shape it would need:**
- An admin-authenticated path — either a `shippingAmount` override honoured only
  when the caller has an admin role, or a separate "adjust order totals" endpoint
  applied after creation. The latter is probably cleaner: it keeps
  `POST /orders` unconditionally safe and leaves an audit trail.
- Recording *why* it was overridden, and by whom. A silent difference between the
  district rate and what was charged is exactly the ambiguity the current fix
  removed.
- A decision on free-shipping thresholds (e.g. free over N BDT), which is the
  same mechanism and probably wants solving at the same time.

**Watch out for:** the rate constants are duplicated — `SHIPPING_INSIDE_DHAKA` /
`SHIPPING_OUTSIDE_DHAKA` exist in both `orders.service.ts` (authoritative) and
Aurevo.UI's `checkout-page.tsx` (display only). `createOrder` logs a warning when
the two disagree. Any work here should consider collapsing that duplication —
e.g. a shipping-quote endpoint the checkout page reads — rather than adding a
third copy.

**Status:** deliberately deferred on 2026-07-30 while closing the security hole.
Not urgent unless someone actually needs to waive a delivery charge.
