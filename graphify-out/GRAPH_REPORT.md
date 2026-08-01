# Graph Report - Aurevo.BE  (2026-08-02)

## Corpus Check
- 261 files · ~400,319 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1695 nodes · 3229 edges · 271 communities (80 shown, 191 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 212 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f53241a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- images.service.ts
- courier.service.ts
- chat.service.ts
- imports.worker-logic.ts
- express
- scripts
- Decisions Log
- devDependencies
- inventory.service.ts
- variants.routes.ts
- cart.service.ts
- test/helpers.ts
- products.service.ts
- admin.service.ts
- compilerOptions
- relations.ts
- db/index.ts
- schema.ts
- meta-conversions/index.ts
- Phase 10 - Bulk Product Import Pipeline (doc)
- categories.routes.ts
- images.routes.ts
- orders.service.ts
- routes/index.ts
- auth.service.ts
- knowledge.service.ts
- products
- eval-answers.ts
- invoice-pdf.ts
- Global Constraints
- Aurevo.BE CLAUDE.md
- wishlist.service.ts
- chat.metrics.ts
- Aurevo.BE README.md
- Chat service (Claude tool-use loop, true token streaming)
- Production objects that exist in no migration
- imports.worker-logic.test.ts
- chat.service.ts (streamChat, tool-use loop)
- chat.orders.service.ts
- authenticate
- Chat service (Claude, tool-use loop, true token streaming)
- deploy
- db-sync.mjs
- rateLimiter.ts
- oauth.service.ts
- package.json
- Import Worker (imports.worker-logic.ts, src/workers/import.worker.ts, pnpm worker)
- variants.service.ts
- middlewares/index.ts
- dependencies
- Observability Strategy (pino, Sentry, health check, graceful shutdown)
- _build-catalog-restore.js
- chat.routes.ts
- keywords
- imports.routes.test.ts
- Aurevo.BE (Express + TypeScript + Drizzle)
- deploy
- db-gen-custom-migration.mjs
- RAG Data Model (kb_chunks/conversations/messages)
- chat.orders.test.ts
- Courier Tracking (Steadfast) module
- worker
- queue.ts
- products.test.ts
- Backend-driven Auth via supabaseAdmin.auth.getClaims
- Chat Request Lifecycle
- RAG Chatbot Architecture Diagram (draft/duplicate of docs/images/rag-chatbot-architecture.svg, the canonical diagram referenced from docs/09-ai-chatbot-rag.md)
- CI Test Job (Stage 1)
- Database Schema Overview
- Tiered Rate Limiters
- interfaces/index.ts
- SSLCommerz Payment Integration (Parked Plan)
- db-baseline.mjs
- chat.internal.test.ts
- orders.test.ts
- express
- CI/CD Pipeline (test/migrate/deploy-functions)
- Real DB, No Mocks on Data Layer Philosophy
- multer
- pino-http
- Inventory Endpoints
- express.d.ts
- Courier Tracking (Steadfast)
- 4-file Domain Module Structure Pattern
- Observability (pino, Sentry, health check)
- Request Lifecycle / Middleware Chain
- @anthropic-ai/sdk
- bullmq
- compression
- Error Hierarchy (AppError tree)
- cart_items Table (dual-owner)
- inventory_movements Table (immutable audit log)
- product_variants Table (stock/reserved_stock)
- user_addresses Table (BD shape, migration 038)
- fileParallelism: false Decision
- seedTestUsers() in beforeAll
- Execution Runbook (capacity, dry-run, smoke, load)
- dotenv
- express-rate-limit
- helmet
- ioredis
- jsonwebtoken
- pdfkit
- postgres
- resend
- @sentry/node
- sharp
- @supabase/supabase-js
- svg-to-pdfkit
- swagger-jsdoc
- swagger-ui-express
- uuid
- zod
- allowBuilds Native Module Approvals
- Codebase Knowledge Graph (graphify)
- Order Confirmation Email (Resend)
- Graphify Skill Pointer (/graphify)
- /graphify add <url> ingestion
- Debounce (default 3s)
- --watch background watcher
- FalkorDB Export / Push
- MCP stdio Server (graphify.serve)
- Neo4j Export / Push
- SVG / GraphML Export
- Token Reduction Benchmark
- Wiki Export (--wiki)
- Confidence Score Rubric
- Hyperedge Extraction Rule
- Node ID Format Rule ({stem}_{entity})
- semantically_similar_to Edge Rule
- Extraction Subagent Prompt Template
- graphify clone (GitHub repo)
- Cross-Repo Graph Merge (merge-graphs)
- Monorepo / Multi-Subfolder Extraction
- graphify claude install (CLAUDE.md integration)
- graphify hook install (post-commit auto-rebuild)
- BFS / DFS Traversal Modes
- Constrained Query Expansion (vocab matching)
- /graphify explain implementation
- /graphify path implementation (shortest_path)
- save-result Feedback Loop
- Work Memory / Self-Improving Loop (LESSONS.md)
- Domain Hint Prompt for Whisper
- Whisper Video/Audio Transcription
- build_merge() replace-on-re-extract (#1344)
- graphify cluster-only (self-contained recluster)
- Graph Diff Reporting
- --update Incremental Re-extraction
- /graphify add
- Structural (AST) Extraction - Part A
- --cluster-only flag
- Community Detection
- Community Labeling (Step 5)
- Cumulative Cost Tracker (cost.json)
- --directed flag (directed graph)
- /graphify explain
- Fast Path - Existing Graph
- God Nodes
- Graph Health Check (Step 4.5)
- graph.json output
- GRAPH_REPORT.md audit output
- Commit Hook / Native CLAUDE.md Integration
- Interactive HTML Graph Export
- No API Key Required Policy
- Obsidian Vault Export
- /graphify path
- /graphify query
- Semantic Extraction Cache (check_semantic_cache)
- Semantic (LLM) Extraction - Part B
- Shrink Guard on graph.json write (#479)
- Parallel Subagent Dispatch (general-purpose)
- --update flag
- --watch flag
- FAQ: Account Needed to Order (guest checkout)
- FAQ: Change or Cancel Order
- FAQ: How to Track Order
- FAQ: Out of Stock Items
- FAQ: Physical Store (online-only)
- Payment: Cash on Delivery
- Payment: Online Payment Option
- Payment: Security (no card details stored)
- Refund process (original payment method or store credit, 7-10 business days)
- Shipping cost calculated at checkout by district
- Sizing: Exchanging for a Different Size
- Sizing: Finding the Right Fit
- Sizing: How Sizes Are Shown (variants)
- Admin Panel Functional Requirements
- Non-Functional Requirements
- Project Brief
- Storefront Functional Requirements
- User Roles (Guest/Customer/Admin)
- Express + TypeScript Choice
- External Integrations Table
- Guest Session Identification (X-Guest-Session)
- Supabase (PostgreSQL 15) Choice
- Zod Validation Choice
- brands Table
- categories Table
- Enums (11)
- Entity Relationship Diagram (Lucidchart)
- Key Indexes on High-Traffic Query Paths
- order_items Table (price snapshot)
- payments Table
- product_images Table
- products Table
- profiles Table
- Brands Endpoints
- Categories Endpoints
- Error Code Reference (API design)
- Health Endpoint (/health, /api/health)
- HTTP Status Code Reference
- Product Images Endpoints
- Internal Endpoints (machine-to-machine)
- Products Endpoints
- Rate Limits (API design)
- BD-Shaped Saved Addresses (implementation)
- Cart getCart Full JOIN
- Composite Filter Pattern (implementation)
- CORS exposedHeaders (Content-Disposition)
- Deep Health Check (implementation)
- Drizzle Client Singleton (src/db/index.ts)
- Dual Owner Cart (CartOwner union type)
- effectivePrice Helper (Cart + Orders)
- Fail-Fast Boot + Graceful Shutdown
- Foundation Layer (Phase 0)
- Git History (Micro-Commits per Module)
- Inventory Upsert Syncs Both Ledgers
- Nested Router Pattern (mergeParams)
- Orders Use authLimiter Not strictLimiter
- Sentry Error Tracking (implementation)
- Supabase Storage Helpers (src/lib/storage.ts)
- Structured Logging (pino)
- Variant-Inventory Transaction (create/bulk create)
- Zod Validation Middleware
- Running Tests Instructions
- Test Structure Pattern (createTestApp)
- Local Development Setup
- Production Infrastructure Map
- Supabase Storage Bucket Setup
- Aurevo.UI Vercel Deployment
- Files to Touch (implementation checklist)
- k6 Load Test Scripts
- Dedicated Load-Test Product Seed
- Verification Checklist
- RAG Configuration (env vars)
- Retention & Cleanup (48h guest / 90d user)
- Merge main back into dev workflow
- Composite Filter Pattern
- Thin Controller Pattern
- Error Codes Reference
- Local-Only DB Rule
- Response Shape Standard
- REST URL Conventions
- Tech Stack Reference
- Zod Validation Pattern
- Change Email Confirmation Template
- Confirm Signup Email Template
- Email Address Changed Notice Template
- Identity Linked Notice Template
- Identity Unlinked Notice Template
- Invite User Email Template
- Magic Link Sign-In Template
- MFA Factor Enrolled Notice Template
- MFA Factor Unenrolled Notice Template
- Phone Number Changed Notice Template
- Reauthentication Verification Code Template

## God Nodes (most connected - your core abstractions)
1. `express` - 49 edges
2. `DB` - 49 edges
3. `scripts` - 36 edges
4. `products` - 33 edges
5. `config` - 30 edges
6. `productVariants` - 24 edges
7. `streamChat()` - 22 edges
8. `Aurevo.BE CLAUDE.md` - 22 edges
9. `Aurevo.BE README.md` - 21 edges
10. `logger` - 20 edges

## Surprising Connections (you probably didn't know these)
- `src/test/global-teardown.ts (self-heals catalog reseed + admin fixture)` --semantically_similar_to--> `Import Worker (imports.worker-logic.ts, src/workers/import.worker.ts, pnpm worker)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/10-bulk-import-pipeline.md
- `Order Invoice PDF (pdfkit)` --references--> `Aurevo Wordmark Logo (black SVG)`  [EXTRACTED]
  ARCHITECTURE.md → assets/logo/aurevo-logo-black.svg
- `Order Invoice PDF + Confirmation Email (skills ref)` --references--> `Aurevo Wordmark Logo (black SVG)`  [EXTRACTED]
  SKILLS.md → assets/logo/aurevo-logo-black.svg
- `Order Confirmation Email + Invoice PDF (implementation)` --references--> `Aurevo Wordmark Logo (black SVG)`  [EXTRACTED]
  docs/05-implementation.md → assets/logo/aurevo-logo-black.svg
- `Aurevo.BE Railway Deployment` --references--> `Aurevo Wordmark Logo (black SVG)`  [EXTRACTED]
  docs/07-deployment.md → assets/logo/aurevo-logo-black.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fire-and-forget, no-op-if-unconfigured side effects** — claudemd_sentry_integration, claudemd_order_confirmation_email, claudemd_auto_embed_pattern [EXTRACTED 1.00]
- **NormalizedProduct shared contract across all import sources** — docs_10_bulk_import_pipeline_normalizedproduct, docs_10_bulk_import_pipeline_import_pipeline_component, docs_10_bulk_import_pipeline_scraper_component, docs_10_bulk_import_pipeline_upload_endpoints [EXTRACTED 1.00]
- **Bulk import end-to-end processing flow** — docs_10_bulk_import_pipeline_upload_endpoints, docs_10_bulk_import_pipeline_import_jobs_table, docs_10_bulk_import_pipeline_import_worker, docs_10_bulk_import_pipeline_insertproduct, docs_10_bulk_import_pipeline_batchupsertproductchunks [EXTRACTED 1.00]
- **Ingestion pipeline components** — docs_images_rag_chatbot_archticture_ingestion_pipeline, docs_images_rag_chatbot_archticture_policy_faq_docs, docs_images_rag_chatbot_archticture_products_db, docs_images_rag_chatbot_archticture_chunk_embed, docs_images_rag_chatbot_archticture_kb_chunks [EXTRACTED 1.00]
- **Runtime chat flow components** — docs_images_rag_chatbot_archticture_runtime_chat_flow, docs_images_rag_chatbot_archticture_chat_service, docs_images_rag_chatbot_archticture_chat_widget, docs_images_rag_chatbot_archticture_get_product_details, docs_images_rag_chatbot_archticture_get_my_orders, docs_images_rag_chatbot_archticture_search_knowledge, docs_images_rag_chatbot_archticture_conversations_messages [EXTRACTED 1.00]
- **Backend modular monolith endpoints** — docs_images_rag_chatbot_archticture_backend_modular_monolith, docs_images_rag_chatbot_archticture_api_products, docs_images_rag_chatbot_archticture_api_orders, docs_images_rag_chatbot_archticture_api_chat [EXTRACTED 1.00]
- **Supabase / PostgreSQL 15 tables** — docs_images_rag_chatbot_archticture_supabase_postgresql, docs_images_rag_chatbot_archticture_products_table, docs_images_rag_chatbot_archticture_orders_table, docs_images_rag_chatbot_archticture_conversations_messages, docs_images_rag_chatbot_archticture_kb_chunks [EXTRACTED 1.00]
- **Aurevo Branded Supabase Auth Email Templates** — supabase_email_templates_change_email_template, supabase_email_templates_confirm_signup_template, supabase_email_templates_email_address_changed_template, supabase_email_templates_identity_linked_template, supabase_email_templates_identity_unlinked_template, supabase_email_templates_invite_user_template, supabase_email_templates_magic_link_template, supabase_email_templates_mfa_enrolled_template, supabase_email_templates_mfa_unenrolled_template, supabase_email_templates_phone_changed_template, supabase_email_templates_reauthentication_template [INFERRED 0.90]
- **Offline ingestion pipeline (products + policy docs to kb_chunks)** — docs_images_rag_chatbot_architecture_products_db, docs_images_rag_chatbot_architecture_policy_faq_docs, docs_images_rag_chatbot_architecture_chunk_embed, docs_images_rag_chatbot_architecture_kb_chunks [INFERRED 0.85]
- **Runtime chat tool-use loop (chat service + three tools)** — docs_images_rag_chatbot_architecture_chat_service, docs_images_rag_chatbot_architecture_search_knowledge, docs_images_rag_chatbot_architecture_get_product_details, docs_images_rag_chatbot_architecture_get_my_orders [INFERRED 0.85]

## Communities (271 total, 191 thin omitted)

### Community 0 - "images.service.ts"
Cohesion: 0.05
Nodes (59): AppError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, UpstreamServiceError, ValidationError (+51 more)

### Community 1 - "courier.service.ts"
Cohesion: 0.09
Nodes (33): getCourierBalance(), isValidWebhookBearer(), receiveWebhook(), refreshOrderStatus(), shipOrder(), trackByCode(), CourierWebhookBody, courierWebhookSchema (+25 more)

### Community 2 - "chat.service.ts"
Cohesion: 0.09
Nodes (39): getAddresses(), formatToolError(), PrepareOrderInput, getClient(), getOrCreateConversation(), loadRecentMessages(), maybeRefreshIntentSummary(), saveMessage() (+31 more)

### Community 3 - "imports.worker-logic.ts"
Cohesion: 0.06
Nodes (58): xlsx, SUPPORTED_MIME_PREFIXES, upload, downloadTemplate(), getImportJob(), getImportRows(), listImportJobs(), parseCandidateArray() (+50 more)

### Community 4 - "express"
Cohesion: 0.19
Nodes (14): express, bindRequestLogContext(), generateRequestId(), httpLogger, serializeRequest(), serializeResponse(), LOG_REDACTION_PATHS, logger (+6 more)

### Community 5 - "scripts"
Cohesion: 0.06
Nodes (35): scripts, build, db:baseline, db:bootstrap, db:check, db:diff, db:dump-prod, db:functions:deploy (+27 more)

### Community 6 - "Decisions Log"
Cohesion: 0.05
Nodes (45): AI Shopping Assistant RAG Pipeline, Aurevo Fashion Platform, Modular Monolith + BFF Pattern, Order Invoice PDF (pdfkit), Atomic Guarded Stock Decrement, Noto Sans Bengali Font, SIL Open Font License v1.1, Aurevo Wordmark Logo (black SVG) (+37 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (39): drizzle-kit, devDependencies, drizzle-kit, pino-pretty, supertest, tsx, @types/bcryptjs, @types/compression (+31 more)

### Community 8 - "inventory.service.ts"
Cohesion: 0.10
Nodes (25): adjustInventory(), exportInventory(), getInventory(), getInventoryById(), getLowStockAlerts(), getMovements(), getVariantAvailability(), upsertInventory() (+17 more)

### Community 9 - "variants.routes.ts"
Cohesion: 0.21
Nodes (15): adjustStock(), bulkCreateVariants(), createVariant(), deleteVariant(), getVariantById(), getVariants(), updateVariant(), AdjustStockInput (+7 more)

### Community 10 - "cart.service.ts"
Cohesion: 0.13
Nodes (28): addItem(), clearCart(), createGuestSession(), getCart(), migrateCart(), removeItem(), resolveOwner(), updateItem() (+20 more)

### Community 11 - "test/helpers.ts"
Cohesion: 0.12
Nodes (18): app, TEST_ADDRESS, router, app, app, app, profiles, userAddresses (+10 more)

### Community 12 - "products.service.ts"
Cohesion: 0.10
Nodes (32): deleteProductChunk(), bulkDelete(), bulkUpdateStatus(), createProduct(), deleteProduct(), getFeaturedProducts(), getProductById(), getProductBySlug() (+24 more)

### Community 13 - "admin.service.ts"
Cohesion: 0.48
Nodes (4): getAiMetricsController(), getDashboard(), router, getAdminDashboard()

### Community 14 - "compilerOptions"
Cohesion: 0.08
Nodes (23): dist, ES2022, node_modules, src/**/*, compilerOptions, baseUrl, declaration, declarationMap (+15 more)

### Community 15 - "relations.ts"
Cohesion: 0.11
Nodes (18): brandsRelations, cartItemsRelations, categoriesRelations, inventoryMovementsRelations, inventoryRelations, metaCapiSentRelations, orderItemsRelations, ordersRelations (+10 more)

### Community 16 - "db/index.ts"
Cohesion: 0.16
Nodes (15): allowedOrigins, app, config, envSchema, parsed, options, swaggerSpec, client (+7 more)

### Community 17 - "schema.ts"
Cohesion: 0.08
Nodes (21): app, addressType, cartItems, chatRole, fulfillmentStatus, guestSessions, importJobStatus, importRowStatus (+13 more)

### Community 18 - "meta-conversions/index.ts"
Cohesion: 0.15
Nodes (25): AdminClient, corsHeaders, createAdminClient(), DbWebhookPayload, getEnv(), handlePurchase(), jsonResponse(), loadOrderContext() (+17 more)

### Community 19 - "Phase 10 - Bulk Product Import Pipeline (doc)"
Cohesion: 0.17
Nodes (21): Bulk Product Import module, Idempotent re-import via products.external_id/source unique constraint, Admin UI component (/admin/imports, Aurevo.UI), Category mapping (src/category-map.ts, keyword-based), import_jobs table, Import Pipeline component (Aurevo.BE), import_rows table, Known Limitations / Backlog (Content-Disposition CORS, Redis outage gap, scraper Shopify-only, no admin audit UI) (+13 more)

### Community 20 - "categories.routes.ts"
Cohesion: 0.18
Nodes (16): createCategory(), deleteCategory(), deleteCategoryImage(), getCategories(), getCategoryById(), updateCategory(), uploadCategoryImage(), upload (+8 more)

### Community 21 - "images.routes.ts"
Cohesion: 0.21
Nodes (14): bulkUploadImages(), deleteImage(), getImageById(), getImages(), setPrimaryImage(), updateImage(), uploadImage(), upload (+6 more)

### Community 22 - "orders.service.ts"
Cohesion: 0.08
Nodes (46): cancelOrder(), claimOrders(), createOrder(), deleteOrder(), getOrderById(), getOrderByNumber(), getOrderInvoicePdf(), getOrders() (+38 more)

### Community 23 - "routes/index.ts"
Cohesion: 0.07
Nodes (20): router, router, router, router, pollCourierStatus(), router, app, TEST_ADDRESS (+12 more)

### Community 24 - "auth.service.ts"
Cohesion: 0.08
Nodes (41): createAddress(), deleteAddress(), deleteAvatar(), forgotPassword(), getAddresses(), getMe(), login(), logout() (+33 more)

### Community 25 - "knowledge.service.ts"
Cohesion: 0.07
Nodes (45): batchUpsertProductChunks(), buildProductChunkText(), buildVariantSummary(), Candidate, candidateColumns, ingestPolicyDocs(), ingestProducts(), keywordSearch() (+37 more)

### Community 26 - "products"
Cohesion: 0.25
Nodes (4): app, createImagesApp(), TINY_GIF, products

### Community 27 - "eval-answers.ts"
Cohesion: 0.22
Nodes (16): aggregate(), AnswerCaseResult, AnswerEvalSummary, buildJudgePrompt(), clampScore(), JudgeScores, keyFactCoverage(), mean() (+8 more)

### Community 28 - "invoice-pdf.ts"
Cohesion: 0.10
Nodes (29): testSendEmail(), testSendSchema, router, buildConfirmationUrl(), emailEnabled(), escapeHtml(), formatShippingAddressLine(), getResend() (+21 more)

### Community 29 - "Global Constraints"
Cohesion: 0.12
Nodes (16): AI Chat Service — Plan 1: Foundation, Ingestion & Retrieval, Deferred to later plans, Global Constraints, Open decisions for Plan 2+, Task 10: Tenant-scoped hybrid retrieval, Task 11: HTTP API for documents and search, Task 12: Server bootstrap, admin CLI, and deployment, Task 1: Repo scaffold and validated config (+8 more)

### Community 30 - "Aurevo.BE CLAUDE.md"
Cohesion: 0.17
Nodes (16): authenticate middleware (supabaseAdmin.auth.getClaims, JWKS/ES256), migrate-job paths-filter base/ref pinning incident (migration 039), CI/CD Pipeline (test -> migrate -> deploy-functions), Dev server (tsx watch) stale-reload gotcha, src/app/config/index.ts (Zod-validated env, crash on boot if invalid), graphify knowledge graph workflow, i18n (English/বাংলা via i18next), supabase/migrations/039_rag_chat_knowledge_base.sql (external reference) (+8 more)

### Community 31 - "wishlist.service.ts"
Cohesion: 0.15
Nodes (16): addItem(), clearWishlist(), getWishlist(), removeByProductId(), removeItem(), router, AddWishlistItemInput, addWishlistItemSchema (+8 more)

### Community 32 - "chat.metrics.ts"
Cohesion: 0.18
Nodes (13): cleanupChatHistory(), AiMetrics, ChatMetric, deleteOldChatMetrics(), getAiMetrics(), MODEL_PRICING_PER_MTOK, num(), numOrNull() (+5 more)

### Community 33 - "Aurevo.BE README.md"
Cohesion: 0.16
Nodes (15): Backend-driven Google/Facebook OAuth (PKCE, state-in-redirect_to), Admin Dashboard feature, Live request-flow architecture diagram (Mermaid.ai), Aurevo.BE repo (Express, TypeScript, Drizzle ORM, Zod, Vitest), Aurevo.UI repo (React 19, Vite, TanStack Query, Tailwind v4, Radix UI), Auth & Profiles (backend-driven, saved address book), Database Scripts (pnpm db:* via supabase CLI), Railway Deployment (Wait for CI, no RAILWAY_TOKEN/railway up) (+7 more)

### Community 34 - "Chat service (Claude tool-use loop, true token streaming)"
Cohesion: 0.18
Nodes (15): /api/chat (SSE stream), /api/orders (transactional), /api/products (read + admin write), Chat service (Claude tool-use loop, true token streaming), Chat widget (Storefront, SSE stream), Chunk + Embed (Voyage AI), conversations + messages (multi-turn history / conversations table), get_my_orders tool (auth-gated only, scoped to req.user.id) (+7 more)

### Community 35 - "Production objects that exist in no migration"
Cohesion: 0.12
Nodes (14): Bucket contents are still not versioned, `ensure_rls`, Functions present in production, absent from every migration, `meta-conversions-purchase` — intentionally not versioned, `on_order_confirmed` / `update_inventory_on_order()` — excluded, Production objects that exist in no migration, RLS policies that drifted in production, Storage buckets — now versioned (+6 more)

### Community 36 - "imports.worker-logic.test.ts"
Cohesion: 0.18
Nodes (11): ONE_PX_PNG, CATEGORY_SLUG_ALIASES, createResolverCache(), generateUniqueProductSlug(), resolveExistingCategory(), resolveOrCreate(), resolveOrCreateBrand(), brands (+3 more)

### Community 37 - "chat.service.ts (streamChat, tool-use loop)"
Cohesion: 0.20
Nodes (12): AI Chat / RAG (chat + knowledge modules), chat_metrics monitoring (migration 044, /admin/ai-metrics), chat.service.ts (streamChat, tool-use loop), Conversation Retention (90d users / 48h guests, cleanup cron), docs/09-ai-chatbot-rag.md (external reference), Eval Harnesses (pnpm eval:retrieval, pnpm eval:answers), History Management (sliding window + rolling intent_summary), hybrid+rerank retrieval default (pgvector + FTS via RRF, Voyage rerank-2.5-lite, eval-gated) (+4 more)

### Community 38 - "chat.orders.service.ts"
Cohesion: 0.15
Nodes (26): ChatOrderDraft, ChatOrderDraftAddress, ChatOrderDraftItem, deleteOrderDraft(), drafts, getOrderDraft(), setOrderDraftForRestore(), storeOrderDraft() (+18 more)

### Community 39 - "authenticate"
Cohesion: 0.21
Nodes (12): authenticate(), optionalAuth(), requireAdmin(), verifyToken(), publicLimiter, validate(), router, getAllImagesAdmin() (+4 more)

### Community 40 - "Chat service (Claude, tool-use loop, true token streaming)"
Cohesion: 0.20
Nodes (10): Chat service (Claude, tool-use loop, true token streaming), Chat widget (storefront, SSE stream), Chunk + embed (Voyage AI), conversations + messages (multi-turn history), get_my_orders (auth-gated only, scoped to req.user.id), get_product_details (live DB lookup, current stock & price), kb_chunks (pgvector store, products + policies), Policy & FAQ docs (Markdown, new content) (+2 more)

### Community 41 - "deploy"
Cohesion: 0.20
Nodes (9): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, startCommand (+1 more)

### Community 42 - "db-sync.mjs"
Cohesion: 0.22
Nodes (6): DUMP_DEFAULT, ENV_LOCAL, restoreLocalData(), ROOT, run(), WIPE_SCRIPT

### Community 43 - "rateLimiter.ts"
Cohesion: 0.22
Nodes (7): authLimiter, baseOptions, cartLimiter, chatLimiter, strictLimiter, trackingLimiter, uploadLimiter

### Community 44 - "oauth.service.ts"
Cohesion: 0.20
Nodes (13): oauthCallback(), oauthSession(), oauthUrl(), ALLOWED_PROVIDERS, ExchangeEntry, exchangeStore, getOAuthUrl(), handleOAuthCallback() (+5 more)

### Community 45 - "package.json"
Cohesion: 0.22
Nodes (8): author, description, engines, node, license, main, name, version

### Community 46 - "Import Worker (imports.worker-logic.ts, src/workers/import.worker.ts, pnpm worker)"
Cohesion: 0.31
Nodes (9): Hook-free bulk insert (insertProduct skips per-product embed hook), knowledge.service.ts, src/lib/voyage.ts (Voyage AI embeddings), batchUpsertProductChunks (knowledge.service.ts, batched Voyage embed), Two-layer failure semantics (BullMQ job retries + per-row retry), Import Worker (imports.worker-logic.ts, src/workers/import.worker.ts, pnpm worker), insertProduct (products.service.ts, hook-free raw-insert core), Slug collision under row concurrency (unique constraint + retry self-heal) (+1 more)

### Community 47 - "variants.service.ts"
Cohesion: 0.19
Nodes (13): BulkCreateVariantsInput, CreateVariantInput, GetAllVariantsQuery, UpdateVariantInput, adjustStock(), assertProductExists(), bulkCreateVariants(), deleteVariant() (+5 more)

### Community 48 - "middlewares/index.ts"
Cohesion: 0.43
Nodes (4): globalErrorHandler(), validateRequest, zodFieldErrors(), sentryEnabled()

### Community 49 - "dependencies"
Cohesion: 0.29
Nodes (7): bcryptjs, drizzle-orm, dependencies, bcryptjs, drizzle-orm, pino, pino

### Community 50 - "Observability Strategy (pino, Sentry, health check, graceful shutdown)"
Cohesion: 0.25
Nodes (8): Auto-embed on product create/update/delete (fire-and-forget, not CDC), /api/health deep check + fail-fast boot + graceful shutdown, src/lib/invoice-pdf.ts (pdfkit, never persisted, Noto Sans Bengali), src/lib/logger.ts (pino, replaced morgan), Observability Strategy (pino, Sentry, health check, graceful shutdown), src/lib/email.ts (Resend, fire-and-forget, no-op-if-unconfigured), src/lib/sentry.ts (no-op unless SENTRY_DSN set), Order Invoice PDF feature

### Community 51 - "_build-catalog-restore.js"
Cohesion: 0.22
Nodes (9): content, fs, leaked, normaliseStorageUrls(), outPath, path, sqlLiteral(), srcPath (+1 more)

### Community 52 - "chat.routes.ts"
Cohesion: 0.25
Nodes (12): cancelChatOrderHandler(), chat(), chatHealth(), confirmChatOrderHandler(), prepareChatOrderHandler(), ChatMessageInput, chatMessageSchema, ChatOrderDraftActionInput (+4 more)

### Community 53 - "keywords"
Cohesion: 0.33
Nodes (6): keywords, api, drizzle, ecommerce, node, supabase

### Community 54 - "imports.routes.test.ts"
Cohesion: 0.14
Nodes (8): app, router, app, router, app, importJobs, inventoryMovements, createTestApp()

### Community 55 - "Aurevo.BE (Express + TypeScript + Drizzle)"
Cohesion: 0.29
Nodes (7): Aurevo.BE (Express + TypeScript + Drizzle), Aurevo.UI (React 19 + Vite storefront/admin), Supabase (Postgres 15 + Auth + Storage), System Diagram, API Response Shape, Build Order & Rationale, Module Build Order

### Community 56 - "deploy"
Cohesion: 0.25
Nodes (7): build, builder, deploy, restartPolicyMaxRetries, restartPolicyType, startCommand, $schema

### Community 57 - "db-gen-custom-migration.mjs"
Cohesion: 0.48
Nodes (6): EXCLUDED_FUNCTIONS, EXCLUDED_TRIGGERS, literal(), main(), OUT, quoteIdent()

### Community 58 - "RAG Data Model (kb_chunks/conversations/messages)"
Cohesion: 0.29
Nodes (7): Other Tables (kb_chunks, conversations, messages, etc.), Row-Level Security Patterns, Migration 039 CI paths-filter Incident, RAG Data Model (kb_chunks/conversations/messages), Ingestion Pipeline (knowledge.service.ts), Production Ingestion Runbook, Rollout Checklist

### Community 60 - "chat.orders.test.ts"
Cohesion: 0.29
Nodes (6): clearOrderDraftsForTests(), app, cleanAll(), TEST_ADDRESS, buildToolList(), productVariants

### Community 61 - "Courier Tracking (Steadfast) module"
Cohesion: 0.40
Nodes (6): Courier Tracking (Steadfast) module, restoreOrderStock shared helper, Atomic Stock Accounting (single guarded UPDATE, no reserve-then-decrement), Courier Tracking (Steadfast) feature, docs/05-implementation.md (external reference), Order Management (atomic stock decrement, lifecycle, sequential order numbers)

### Community 63 - "queue.ts"
Cohesion: 0.43
Nodes (6): createQueueConnection(), IMPORT_QUEUE_NAME, ImportJobPayload, importQueue, throttledErrorLogger(), importWorker

### Community 64 - "products.test.ts"
Cohesion: 0.29
Nodes (3): router, app, cleanProducts()

### Community 65 - "Backend-driven Auth via supabaseAdmin.auth.getClaims"
Cohesion: 0.40
Nodes (5): Backend-driven Auth via supabaseAdmin.auth.getClaims, No Supabase SDK on Frontend, Auth Design (JWKS getClaims), JWT Verification Middleware (getClaims), Auth Middleware (authenticate/optionalAuth/requireAdmin)

### Community 66 - "Chat Request Lifecycle"
Cohesion: 0.40
Nodes (5): Lazy Anthropic Client Initialization, Chat Request Lifecycle, Frontend Chat Widget (ai-chat-widget.tsx), Chat Guardrails (auth-gated get_my_orders), Product Card Matching (three-tier)

### Community 67 - "RAG Chatbot Architecture Diagram (draft/duplicate of docs/images/rag-chatbot-architecture.svg, the canonical diagram referenced from docs/09-ai-chatbot-rag.md)"
Cohesion: 0.40
Nodes (5): Backend: Modular Monolith (Express + TypeScript), RAG Chatbot Architecture Diagram (draft/duplicate of docs/images/rag-chatbot-architecture.svg, the canonical diagram referenced from docs/09-ai-chatbot-rag.md), Ingestion pipeline (offline, re-run after catalog changes), Runtime chat flow (every customer message), Supabase / PostgreSQL 15

### Community 68 - "CI Test Job (Stage 1)"
Cohesion: 0.50
Nodes (5): CI Deploy Edge Functions Job (Stage 3), CI Migrate Job (Stage 2), Migration 039 silently skipped twice (dorny/paths-filter race with merge-back.yml), paths-filter base/ref pinning to event SHAs, CI Test Job (Stage 1)

### Community 69 - "Database Schema Overview"
Cohesion: 0.50
Nodes (4): Data Layer (PostgreSQL via Supabase), Drizzle ORM (introspect-first) Choice, Database Schema Overview, Drizzle Schema (23 tables, 11 enums)

### Community 70 - "Tiered Rate Limiters"
Cohesion: 0.50
Nodes (4): Tiered Rate Limiters, Environment Variable Security Table, Rate-Limiter Bypass Token, Rate Limiter Reference (skills)

### Community 71 - "interfaces/index.ts"
Cohesion: 0.33
Nodes (5): ApiResponse, Express, PaginatedResponse, PaginationParams, Request

### Community 72 - "SSLCommerz Payment Integration (Parked Plan)"
Cohesion: 0.09
Nodes (20): Backend work, Client — `src/lib/sslcommerz.ts`, Config / env ([`src/app/config/index.ts`](../src/app/config/index.ts), [`.env.example`](../.env.example)), Current hooks we will reuse, Docs / policy touch-ups during implementation, Frontend contract (Aurevo.UI — separate pass), Go-live checklist (sandbox → purchased live), Implementation checklist (when sandbox is ready) (+12 more)

### Community 75 - "orders.test.ts"
Cohesion: 0.25
Nodes (3): app, TEST_ADDRESS, productReviews

### Community 77 - "CI/CD Pipeline (test/migrate/deploy-functions)"
Cohesion: 0.67
Nodes (3): Two-Environment CI/CD Model, CI/CD Pipeline (test/migrate/deploy-functions), merge-back.yml Workflow

### Community 78 - "Real DB, No Mocks on Data Layer Philosophy"
Cohesion: 0.67
Nodes (3): Testing Strategy Overview, Vitest + Supertest, Real DB over Mocks, Real DB, No Mocks on Data Layer Philosophy

### Community 81 - "Inventory Endpoints"
Cohesion: 0.67
Nodes (3): inventory Table (generated available_quantity), Inventory Endpoints, Server-Side XLSX Export

## Knowledge Gaps
- **561 isolated node(s):** `name`, `version`, `description`, `main`, `node` (+556 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **191 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `express` to `images.service.ts`, `courier.service.ts`, `imports.worker-logic.ts`, `inventory.service.ts`, `variants.routes.ts`, `cart.service.ts`, `products.service.ts`, `admin.service.ts`, `db/index.ts`, `categories.routes.ts`, `images.routes.ts`, `orders.service.ts`, `routes/index.ts`, `auth.service.ts`, `products`, `invoice-pdf.ts`, `wishlist.service.ts`, `chat.metrics.ts`, `authenticate`, `oauth.service.ts`, `middlewares/index.ts`, `chat.routes.ts`, `keywords`, `imports.routes.test.ts`, `interfaces/index.ts`, `chat.internal.test.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `keywords` connect `keywords` to `express`, `package.json`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `imports.worker-logic.ts`, `package.json`, `express`, `multer`, `pino-http`, `@anthropic-ai/sdk`, `bullmq`, `compression`, `dotenv`, `express-rate-limit`, `helmet`, `ioredis`, `jsonwebtoken`, `pdfkit`, `postgres`, `resend`, `@sentry/node`, `sharp`, `@supabase/supabase-js`, `svg-to-pdfkit`, `swagger-jsdoc`, `swagger-ui-express`, `uuid`, `zod`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _561 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `images.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05171907140758154 - nodes in this community are weakly interconnected._
- **Should `courier.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._
- **Should `chat.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08943089430894309 - nodes in this community are weakly interconnected._