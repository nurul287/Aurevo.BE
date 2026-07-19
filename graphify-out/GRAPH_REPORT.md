# Graph Report - Aurevo.BE  (2026-07-20)

## Corpus Check
- 198 files · ~262,220 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1527 nodes · 2461 edges · 284 communities (75 shown, 209 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e22f77a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Error Type Hierarchy
- Auth & Address Controller
- Express App Bootstrap & Swagger
- Chat Persistence Layer
- Orders Controller
- Package Metadata
- Runtime Dependencies
- Inventory Controller
- Dev Dependencies
- Cart Controller
- Graphify Export & Traversal Features
- TypeScript Compiler Config
- Category/Product Routes & Tests
- Products Controller
- Meta CAPI Webhook Function
- Drizzle Schema Relations
- Admin Dashboard & Enums
- Product Images Admin API
- Inventory Tests & Error Handler
- Categories Controller
- Courier Webhook & Ship/Refresh Controller
- Courier Service & Internal Poll Route
- Auth & Orders Route Tests
- App Bootstrap & Images Tests
- Variants Service & Schema
- Workspace Architecture Overview
- Products Service
- Requirements Backlog & CI/CD Decisions
- Non-Functional Requirements & Rate Limits
- RAG Chatbot Architecture Diagram
- Railway Deployment Config
- DB Sync Script
- Auth Middleware
- Graphify Extraction Spec
- Cart Route Tests
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 49
- Community 50
- Courier Internal Poll Tests
- Courier Ship/Webhook Tests
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- rateLimiter.ts
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Dev Branch Merge-Back Workflow
- pnpm Workspace Config
- API Response Shape Standard
- Request Validation Middleware
- Change Email Confirmation Template
- Signup Confirmation Email Template
- Email Changed Notice Template
- Magic Link Sign-In Template
- Reauthentication Code Template
- graphify reference: transcribe video and audio
- Auth Design (JWKS getClaims)
- graphify
- extraction-spec.md
- AI Shopping Assistant (RAG pipeline)
- Aurevo.BE (Express + TypeScript + Drizzle backend)
- Aurevo.UI (React storefront/admin)
- JWKS-based auth via supabaseAdmin.auth.getClaims
- CI/CD & two-environment model
- Modular Monolith + BFF pattern (chosen over microservices)
- 4-file domain module structure (schema/service/controller/routes/test)
- No Supabase SDK on frontend (single most important architectural decision)
- Backend-driven Google/Facebook OAuth (PKCE, state-in-redirect_to)
- Observability stack (pino, Sentry, health check, graceful shutdown)
- Request lifecycle (middleware chain)
- Atomic guarded UPDATE stock accounting at checkout
- Supabase (Postgres 15 + Auth + Storage)
- Testing strategy (BE Vitest+Supertest, FE Vitest+MSW, E2E Playwright)
- AI chat / RAG module (chat + knowledge)
- cartLimiter split from authLimiter (routine adds vs brute-force)
- Graphify Skill Pointer (/graphify)
- Development workflow (build, test, micro-commit, no auto-deploy)
- Zod-validated env vars in src/app/config/index.ts crash-on-boot
- graphify usage rules (query/path/explain, mandatory update after code changes)
- Migration 039 kept out of production for two merges — CI silent-skip incident
- OAuth top-level state param collision with GoTrue gotcha
- logger.ts/sentry.ts/health check/fail-fast boot
- Resend email, migrated from earlier Gmail SMTP stopgap
- Shared restoreOrderStock helper
- getAddresses ORDER BY created_at ASC fix (card position swap bug)
- FalkorDB Export / Push
- MCP stdio Server (graphify.serve)
- Neo4j Export / Push
- Token Reduction Benchmark
- Wiki Export (--wiki)
- Hyperedge Extraction Rule
- Node ID Format Rule ({stem}_{entity})
- semantically_similar_to Edge Rule
- Extraction Subagent Prompt Template
- Cross-Repo Graph Merge (merge-graphs)
- Monorepo / Multi-Subfolder Extraction
- graphify hook install (post-commit auto-rebuild)
- BFS / DFS Traversal Modes
- Constrained Query Expansion (vocab matching)
- /graphify explain implementation
- /graphify path implementation (shortest_path)
- save-result Feedback Loop
- Work Memory / Self-Improving Loop (LESSONS.md)
- Whisper Video/Audio Transcription
- build_merge() replace-on-re-extract (#1344)
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
- Historic double-counting bug: reserved_quantity incremented AND quantity decremented for same sale
- FAQ: How to Track Order
- FAQ: Out of Stock Items
- Payment: Online Payment Option
- Payment: Security (no card details stored)
- Sizing: Finding the Right Fit
- Sizing: How Sizes Are Shown (variants)
- AI Shopping Assistant Requirement
- No Dedicated Staging Supabase Project (Decision)
- AI Chat Rebuilt as Full RAG Pipeline (Decision)
- Testing: Vitest + Supertest Choice
- cart_items table (dual-owner: user or guest session)
- categories table (self-referencing tree)
- conversations table (chat sessions, retention-driving)
- guest_sessions missing RLS until migration 040 (incident)
- inventory_movements table (immutable audit log)
- inventory table (generated available_quantity column)
- kb_chunks table (RAG vector knowledge base, migration 039)
- messages table (chat turns, cascade delete)
- order_items table (price/name snapshot)
- orders table (full lifecycle)
- payments table
- product_variants table (stock, reserved_stock)
- products table (core catalog)
- profiles table (1:1 extension of auth.users)
- Database Design overview (22 tables, 11 enums)
- user_addresses table (BD checkout shape, migration 038)
- AI Chat endpoint (/api/chat, SSE protocol)
- Auth & Profile endpoint reference (/api/auth)
- POST /cart/items moved off authLimiter to own cartLimiter
- Health endpoint (/health, /api/health)
- Inventory endpoint reference (/api/inventory)
- Orders endpoint reference (/api/orders)
- AI Chat RAG pipeline rebuild (from bare tool-use to full RAG)
- JWT verification middleware (getClaims/JWKS)
- Module Build Order & Rationale (Phase 0-10)
- CORS exposedHeaders: [Content-Disposition] required for xlsx filename
- Drizzle client singleton (src/db/index.ts)
- Dual Owner Cart (CartOwner union type)
- effectivePrice helper (variant.price ?? product.basePrice)
- Inventory upsert syncs inventory + product_variants.stock
- Lazy Anthropic client initialization (test-mockable)
- Nested Router Pattern (mergeParams for variants/images)
- Transactional Stock Reservation (Orders, stock/reservedStock update)
- Variant–Inventory creation transaction
- Testing Philosophy: Real DB, No Mocks
- CI/CD Pipeline (ci.yml)
- Running Tests (docs/07)
- Execution Runbook
- Files to Touch (Load Testing)
- Rate-Limiter Bypass Design
- Known limitations / Backlog (no CDC, no reranking, no eval harness)
- Migration 039 silently skipped twice — RAG rollout incident
- Policy-doc chunking dropped heading-only sections bug (fixed)
- Aurevo Fashion project overview
- Tech Decisions at a Glance table
- Modular Monolith directory structure
- Rate Limiters table

## God Nodes (most connected - your core abstractions)
1. `express` - 43 edges
2. `DB` - 33 edges
3. `scripts` - 31 edges
4. `products` - 24 edges
5. `Key Implementation Patterns` - 20 edges
6. `productVariants` - 18 edges
7. `Aurevo.BE — Skills & Standards Reference` - 18 edges
8. `compilerOptions` - 17 edges
9. `streamChat()` - 16 edges
10. `Table Reference` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Invite User Email Template` --conceptually_related_to--> `Admin User Role`  [AMBIGUOUS]
  supabase/email-templates/invite-user.html → docs/01-requirements.md
- `MFA Factor Enrolled Notice Template` --conceptually_related_to--> `Storefront Authentication Requirements`  [AMBIGUOUS]
  supabase/email-templates/mfa-enrolled.html → docs/01-requirements.md
- `MFA Factor Unenrolled Notice Template` --conceptually_related_to--> `Storefront Authentication Requirements`  [AMBIGUOUS]
  supabase/email-templates/mfa-unenrolled.html → docs/01-requirements.md
- `Phone Number Changed Notice Template` --conceptually_related_to--> `Profile & Addresses Requirements (BD shape)`  [AMBIGUOUS]
  supabase/email-templates/phone-changed.html → docs/01-requirements.md
- `buildXlsxBuffer()` --references--> `xlsx`  [EXTRACTED]
  src/lib/xlsx-export.ts → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RAG Chatbot Pipeline (ingestion + runtime chat + vector data model)** — docs_09_ai_chatbot_rag_ingestion_pipeline, docs_09_ai_chatbot_rag_chat_request_lifecycle, docs_03_database_design_kb_chunks_table, architecture_ai_shopping_assistant [INFERRED 0.85]
- **Migration 039 silent-skip CI incident (cross-doc)** — github_workflows_ci_migration_039_skip_incident, github_workflows_ci_paths_filter_base_ref_pinning, claude_migration_039_ci_incident, docs_09_ai_chatbot_rag_migration_039_incident [EXTRACTED 1.00]
- **Stock accounting model across architecture, bug history, and implementation sample (possible doc staleness)** — architecture_stock_accounting, claude_stock_accounting_double_count_bug, docs_05_implementation_transactional_stock_reservation, docs_03_database_design_product_variants_table [INFERRED 0.75]
- **Ingestion pipeline components** — docs_images_rag_chatbot_archticture_ingestion_pipeline, docs_images_rag_chatbot_archticture_policy_faq_docs, docs_images_rag_chatbot_archticture_products_db, docs_images_rag_chatbot_archticture_chunk_embed, docs_images_rag_chatbot_archticture_kb_chunks [EXTRACTED 1.00]
- **Runtime chat flow components** — docs_images_rag_chatbot_archticture_runtime_chat_flow, docs_images_rag_chatbot_archticture_chat_service, docs_images_rag_chatbot_archticture_chat_widget, docs_images_rag_chatbot_archticture_get_product_details, docs_images_rag_chatbot_archticture_get_my_orders, docs_images_rag_chatbot_archticture_search_knowledge, docs_images_rag_chatbot_archticture_conversations_messages [EXTRACTED 1.00]
- **Backend modular monolith endpoints** — docs_images_rag_chatbot_archticture_backend_modular_monolith, docs_images_rag_chatbot_archticture_api_products, docs_images_rag_chatbot_archticture_api_orders, docs_images_rag_chatbot_archticture_api_chat [EXTRACTED 1.00]
- **Supabase / PostgreSQL 15 tables** — docs_images_rag_chatbot_archticture_supabase_postgresql, docs_images_rag_chatbot_archticture_products_table, docs_images_rag_chatbot_archticture_orders_table, docs_images_rag_chatbot_archticture_conversations_messages, docs_images_rag_chatbot_archticture_kb_chunks [EXTRACTED 1.00]
- **Aurevo Branded Supabase Auth Email Templates** — supabase_email_templates_change_email_template, supabase_email_templates_confirm_signup_template, supabase_email_templates_email_address_changed_template, supabase_email_templates_identity_linked_template, supabase_email_templates_identity_unlinked_template, supabase_email_templates_invite_user_template, supabase_email_templates_magic_link_template, supabase_email_templates_mfa_enrolled_template, supabase_email_templates_mfa_unenrolled_template, supabase_email_templates_phone_changed_template, supabase_email_templates_reauthentication_template [INFERRED 0.90]
- **Offline ingestion pipeline (products + policy docs to kb_chunks)** — docs_images_rag_chatbot_architecture_products_db, docs_images_rag_chatbot_architecture_policy_faq_docs, docs_images_rag_chatbot_architecture_chunk_embed, docs_images_rag_chatbot_architecture_kb_chunks [INFERRED 0.85]
- **Runtime chat tool-use loop (chat service + three tools)** — docs_images_rag_chatbot_architecture_chat_service, docs_images_rag_chatbot_architecture_search_knowledge, docs_images_rag_chatbot_architecture_get_product_details, docs_images_rag_chatbot_architecture_get_my_orders [INFERRED 0.85]

## Communities (284 total, 209 thin omitted)

### Community 0 - "Error Type Hierarchy"
Cohesion: 0.06
Nodes (47): AppError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, UpstreamServiceError, ValidationError (+39 more)

### Community 1 - "Auth & Address Controller"
Cohesion: 0.07
Nodes (47): createAddress(), deleteAddress(), deleteAvatar(), forgotPassword(), getAddresses(), getMe(), login(), logout() (+39 more)

### Community 2 - "Express App Bootstrap & Swagger"
Cohesion: 0.11
Nodes (28): bulkDelete(), bulkUpdateStatus(), createProduct(), deleteProduct(), getFeaturedProducts(), getProductById(), getProductBySlug(), getProducts() (+20 more)

### Community 3 - "Chat Persistence Layer"
Cohesion: 0.14
Nodes (24): cancelOrder(), claimOrders(), deleteOrder(), getOrderById(), getOrderByNumber(), getOrders(), getOrderStats(), updateFulfillment() (+16 more)

### Community 4 - "Orders Controller"
Cohesion: 0.04
Nodes (47): @anthropic-ai/sdk, bcryptjs, compression, dotenv, drizzle-orm, express, express-rate-limit, helmet (+39 more)

### Community 5 - "Package Metadata"
Cohesion: 0.04
Nodes (45): author, description, engines, node, keywords, license, main, name (+37 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (25): adjustInventory(), exportInventory(), getInventory(), getInventoryById(), getLowStockAlerts(), getMovements(), getVariantAvailability(), upsertInventory() (+17 more)

### Community 7 - "Inventory Controller"
Cohesion: 0.05
Nodes (39): drizzle-kit, devDependencies, drizzle-kit, pino-pretty, supertest, tsx, @types/bcryptjs, @types/compression (+31 more)

### Community 8 - "Dev Dependencies"
Cohesion: 0.13
Nodes (28): addItem(), clearCart(), createGuestSession(), getCart(), migrateCart(), removeItem(), resolveOwner(), updateItem() (+20 more)

### Community 9 - "Cart Controller"
Cohesion: 0.11
Nodes (30): adjustStock(), bulkCreateVariants(), createVariant(), deleteVariant(), getVariantById(), getVariants(), updateVariant(), router (+22 more)

### Community 10 - "Graphify Export & Traversal Features"
Cohesion: 0.33
Nodes (5): Delivery areas, Delivery time, Order tracking, Shipping, Shipping cost

### Community 11 - "TypeScript Compiler Config"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 12 - "Category/Product Routes & Tests"
Cohesion: 0.16
Nodes (13): app, app, app, cleanProducts(), DB, brands, categories, cleanBrands() (+5 more)

### Community 13 - "Products Controller"
Cohesion: 0.05
Nodes (67): getClient(), getOrCreateConversation(), loadRecentMessages(), maybeRefreshIntentSummary(), saveMessage(), touchConversation(), buildSystemPrompt(), buildToolList() (+59 more)

### Community 14 - "Meta CAPI Webhook Function"
Cohesion: 0.08
Nodes (24): dist, ES2022, node_modules, src/*, compilerOptions, baseUrl, declaration, declarationMap (+16 more)

### Community 15 - "Drizzle Schema Relations"
Cohesion: 0.17
Nodes (22): AdminClient, corsHeaders, createAdminClient(), DbWebhookPayload, getEnv(), handlePurchase(), jsonResponse(), loadOrderContext() (+14 more)

### Community 16 - "Admin Dashboard & Enums"
Cohesion: 0.09
Nodes (21): addressesRelations, brandsRelations, cartItemsRelations, categoriesRelations, inventoryMovementsRelations, inventoryRelations, metaCapiSentRelations, orderItemsRelations (+13 more)

### Community 17 - "Product Images Admin API"
Cohesion: 0.18
Nodes (16): createCategory(), deleteCategory(), deleteCategoryImage(), getCategories(), getCategoryById(), updateCategory(), uploadCategoryImage(), upload (+8 more)

### Community 18 - "Inventory Tests & Error Handler"
Cohesion: 0.18
Nodes (17): publicLimiter, router, bulkUploadImages(), deleteImage(), getAllImagesAdmin(), getImageById(), getImages(), setPrimaryImage() (+9 more)

### Community 19 - "Categories Controller"
Cohesion: 0.19
Nodes (19): UpdateFulfillmentInput, UpdatePaymentStatusInput, cancelOrder(), claimGuestOrders(), createOrder(), DbTransaction, fetchOrderItemsWithImages(), generateOrderNumber() (+11 more)

### Community 20 - "Courier Webhook & Ship/Refresh Controller"
Cohesion: 0.05
Nodes (52): allowedOrigins, app, envSchema, parsed, options, swaggerSpec, cleanupChatHistory(), router (+44 more)

### Community 21 - "Courier Service & Internal Poll Route"
Cohesion: 0.22
Nodes (8): router, router, router, router, router, router, router, router

### Community 22 - "Auth & Orders Route Tests"
Cohesion: 0.12
Nodes (16): Architecture Diagram, Chat Request Lifecycle, Configuration, Data Model, File Reference, Frontend Widget, Guardrails, Ingestion Pipeline (+8 more)

### Community 24 - "Variants Service & Schema"
Cohesion: 0.18
Nodes (15): /api/chat (SSE stream), /api/orders (transactional), /api/products (read + admin write), Chat service (Claude tool-use loop, true token streaming), Chat widget (Storefront, SSE stream), Chunk + Embed (Voyage AI), conversations + messages (multi-turn history / conversations table), get_my_orders tool (auth-gated only, scoped to req.user.id) (+7 more)

### Community 25 - "Workspace Architecture Overview"
Cohesion: 0.18
Nodes (14): testSendEmail(), testSendSchema, router, createOrder(), buildConfirmationUrl(), emailEnabled(), escapeHtml(), formatShippingAddressLine() (+6 more)

### Community 26 - "Products Service"
Cohesion: 0.33
Nodes (5): ApiResponse, Express, PaginatedResponse, PaginationParams, Request

### Community 27 - "Requirements Backlog & CI/CD Decisions"
Cohesion: 0.38
Nodes (7): express, authenticate(), optionalAuth(), requireAdmin(), verifyToken(), getDashboard(), getAdminDashboard()

### Community 28 - "Non-Functional Requirements & Rate Limits"
Cohesion: 0.17
Nodes (10): app, TEST_ADDRESS, app, TEST_ADDRESS, courierTrackingEvents, inventory, orderItems, orders (+2 more)

### Community 29 - "RAG Chatbot Architecture Diagram"
Cohesion: 0.50
Nodes (5): CI Deploy Edge Functions Job (Stage 3), CI Migrate Job (Stage 2), Migration 039 silently skipped twice (dorny/paths-filter race with merge-back.yml), paths-filter base/ref pinning to event SHAs, CI Test Job (Stage 1)

### Community 30 - "Railway Deployment Config"
Cohesion: 0.17
Nodes (17): getOrderInvoicePdf(), buildInvoicePdfBuffer(), deriveInvoicePayment(), Doc, drawItemsHeader(), extractEmailAddress(), FONT_BOLD, FONT_REGULAR (+9 more)

### Community 31 - "DB Sync Script"
Cohesion: 0.25
Nodes (7): Architecture, Commands, Development workflow (always apply), Environment, graphify, Key gotchas, Workspace-wide decisions

### Community 32 - "Auth Middleware"
Cohesion: 0.08
Nodes (24): `brands`, `cart_items`, `categories`, `courier_tracking_events`, Entity Relationship Diagram, Enums, Indexes, Interactive Lucidchart Diagram (+16 more)

### Community 33 - "Graphify Extraction Spec"
Cohesion: 0.29
Nodes (6): Exchanges, How to start a return, Non-returnable items, Refunds, Return window, Returns & Exchanges

### Community 34 - "Cart Route Tests"
Cohesion: 0.20
Nodes (10): Chat service (Claude, tool-use loop, true token streaming), Chat widget (storefront, SSE stream), Chunk + embed (Voyage AI), conversations + messages (multi-turn history), get_my_orders (auth-gated only, scoped to req.user.id), get_product_details (live DB lookup, current stock & price), kb_chunks (pgvector store, products + policies), Policy & FAQ docs (Markdown, new content) (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.20
Nodes (9): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, startCommand (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (6): DUMP_DEFAULT, ENV_LOCAL, restoreLocalData(), ROOT, run(), WIPE_SCRIPT

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (14): Architecture Pattern: Modular Monolith + BFF, Auth Design, Backend: Express + TypeScript, Database: Supabase (PostgreSQL 15), Error Hierarchy, External Integrations, Module Structure, ORM: Drizzle ORM (introspect-first) (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (13): createBrand(), deleteBrand(), getBrandById(), getBrands(), updateBrand(), upload, brandIdSchema, CreateBrandInput (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (13): addresses, addressType, chatRole, fulfillmentStatus, kbSourceType, movementReason, movementType, orderStatus (+5 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (5): router, app, createImagesApp(), TINY_GIF, productImages

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (6): content, fs, outPath, path, srcPath, tables

### Community 42 - "Community 42"
Cohesion: 0.36
Nodes (5): validate(), zodFieldErrors(), router, getAllVariants(), getAllVariantsSchema

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (3): app, cartItems, guestSessions

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (33): AI Chat — RAG Pipeline (rebuilt), BD-Shaped Saved Addresses, Build Order & Rationale, Cart `getCart` — Full JOIN, Composite Filter Pattern (Products, Orders, Inventory), CORS `exposedHeaders`, Courier Tracking (Steadfast), Deep Health Check (+25 more)

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (12): 1. Rate-limiter bypass (small BE change, no-op by default), 2. Synthetic-traffic tagging: `X-Load-Test-Run-Id` header → `loadTestRunId` column, 3. Seed a dedicated load-test product (manual, before each run), 4. k6 scripts (new `Aurevo.BE/loadtest/` directory), 5. Cleanup script (new `Aurevo.BE/loadtest/cleanup.ts`), 6. Execution runbook, Aurevo — Load Testing (k6, full user journey, against production), Context (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (9): app, TEST_ADDRESS, app, TEST_ADDRESS, productReviews, profiles, userAddresses, MOCK_ADMIN_USER (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (3): Storefront Authentication Requirements, MFA Factor Enrolled Notice Template, MFA Factor Unenrolled Notice Template

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (14): Coverage by Module, `createTestApp(router)`, FK-Safe Cleanup Order, `generateToken(user)`, Key config (`vitest.config.ts`), Mock users, Phase 6 — Testing Strategy, Philosophy: Real DB, No Mocks on the Data Layer (+6 more)

### Community 51 - "Courier Internal Poll Tests"
Cohesion: 0.14
Nodes (14): AI Chat — `/api/chat`, Auth & Profile — `/api/auth`, Brands — `/api/brands`, Cart — `/api/cart`, Categories — `/api/categories`, Courier — `/api/courier`, Endpoint Reference, Health — `/health` · `/api/health` (+6 more)

### Community 52 - "Courier Ship/Webhook Tests"
Cohesion: 0.33
Nodes (4): globalErrorHandler(), app, createVariantsApp(), createTestApp()

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (10): 1. What this is, 2. High-level architecture, 3. Backend (Aurevo.BE), 4. Frontend (Aurevo.UI), 5. Data layer, 6. CI/CD & environments, 7. Testing, 8. Codebase knowledge graph (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (5): Backend: Modular Monolith (Express + TypeScript), RAG Chatbot Architecture Diagram (draft/duplicate of docs/images/rag-chatbot-architecture.svg, the canonical diagram referenced from docs/09-ai-chatbot-rag.md), Ingestion pipeline (offline, re-run after catalog changes), Runtime chat flow (every customer message), Supabase / PostgreSQL 15

### Community 56 - "Community 56"
Cohesion: 0.33
Nodes (5): Between sizes, Exchanging for a different size, Finding the right fit, How sizes are shown, Sizing Guide

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): Authentication, Base URL, Error Code Reference, HTTP Status Code Reference, Interactive Docs, Rate Limits, Response Shape

### Community 76 - "rateLimiter.ts"
Cohesion: 0.25
Nodes (6): authLimiter, baseOptions, cartLimiter, strictLimiter, trackingLimiter, uploadLimiter

### Community 80 - "Community 80"
Cohesion: 0.18
Nodes (7): Database Scripts, Deployment (Railway), Key Features, Live Architecture, Repositories, SDLC Documentation, Tech Decisions at a Glance

### Community 81 - "Community 81"
Cohesion: 0.11
Nodes (18): AI Chat Module (Phase 10, rebuilt as RAG), AppError Classes, Architecture, Aurevo.BE — Skills & Standards Reference, Auth Middleware, Composite Filter Pattern (list endpoints), Controller Pattern, Courier (Steadfast) (+10 more)

### Community 82 - "Community 82"
Cohesion: 0.20
Nodes (10): Admin Panel, Backlog, Decisions Log, Functional Requirements, Non-Functional Requirements, Out of Scope (for this portfolio build), Phase 1 — Requirements, Project Brief (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (5): Cash on delivery, Online payment, Order confirmation, Payment Methods, Payment security

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 93 - "Community 93"
Cohesion: 0.29
Nodes (7): chatLimiter, chat(), chatHealth(), router, ChatMessageInput, chatMessageSchema, app

### Community 104 - "Community 104"
Cohesion: 0.29
Nodes (6): Can I change or cancel my order after placing it?, Do I need an account to order?, Do you have a physical store?, Frequently Asked Questions, How do I track my order?, What if an item I want is out of stock?

### Community 108 - "Community 108"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 112 - "Community 112"
Cohesion: 0.40
Nodes (5): 1. Start local database, 2. Run the backend API, 3. Run the frontend, Prerequisites, Quick Start

### Community 116 - "Community 116"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 120 - "Community 120"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 123 - "Community 123"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 125 - "Community 125"
Cohesion: 0.11
Nodes (17): Aurevo.BE — Railway, Aurevo.UI — Vercel, CI/CD, Environment Variable Security, Infrastructure Map, Local Development Setup, Merge-back (`merge-back.yml`) — on push to `main`, Monitoring (+9 more)

### Community 150 - "Auth Design (JWKS getClaims)"
Cohesion: 0.67
Nodes (3): Auth Design (JWKS getClaims), Identity Linked Notice Template, Identity Unlinked Notice Template

## Ambiguous Edges - Review These
- `Admin User Role` → `Invite User Email Template`  [AMBIGUOUS]
  supabase/email-templates/invite-user.html · relation: conceptually_related_to
- `Storefront Authentication Requirements` → `MFA Factor Enrolled Notice Template`  [AMBIGUOUS]
  supabase/email-templates/mfa-enrolled.html · relation: conceptually_related_to
- `Storefront Authentication Requirements` → `MFA Factor Unenrolled Notice Template`  [AMBIGUOUS]
  supabase/email-templates/mfa-unenrolled.html · relation: conceptually_related_to
- `Profile & Addresses Requirements (BD shape)` → `Phone Number Changed Notice Template`  [AMBIGUOUS]
  supabase/email-templates/phone-changed.html · relation: conceptually_related_to

## Knowledge Gaps
- **660 isolated node(s):** `name`, `version`, `description`, `main`, `node` (+655 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **209 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Admin User Role` and `Invite User Email Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Storefront Authentication Requirements` and `MFA Factor Enrolled Notice Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Storefront Authentication Requirements` and `MFA Factor Unenrolled Notice Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Profile & Addresses Requirements (BD shape)` and `Phone Number Changed Notice Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `express` connect `Requirements Backlog & CI/CD Decisions` to `Auth & Address Controller`, `Express App Bootstrap & Swagger`, `Chat Persistence Layer`, `Package Metadata`, `Community 38`, `Runtime Dependencies`, `Dev Dependencies`, `Community 40`, `Community 42`, `Cart Controller`, `Product Images Admin API`, `Inventory Tests & Error Handler`, `Courier Webhook & Ship/Refresh Controller`, `Courier Ship/Webhook Tests`, `Courier Service & Internal Poll Route`, `Workspace Architecture Overview`, `Products Service`, `Community 93`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Metadata` to `Requirements Backlog & CI/CD Decisions`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Orders Controller` to `Package Metadata`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._