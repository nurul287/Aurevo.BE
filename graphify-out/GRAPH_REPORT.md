# Graph Report - .  (2026-07-18)

## Corpus Check
- 31 files · ~252,174 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1204 nodes · 2040 edges · 149 communities (66 shown, 83 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.85)
- Token cost: 231,198 input · 0 output

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
- Community 76
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

## God Nodes (most connected - your core abstractions)
1. `express` - 39 edges
2. `scripts` - 30 edges
3. `products` - 23 edges
4. `db` - 20 edges
5. `productVariants` - 18 edges
6. `compilerOptions` - 17 edges
7. `streamChat()` - 16 edges
8. `authenticate()` - 14 edges
9. `graphify (knowledge graph tool)` - 14 edges
10. `AppError` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Workspace-wide decisions (two-environment model, CI/CD, no-SDK, i18n, observability)` --semantically_similar_to--> `No Supabase SDK on frontend (single most important architectural decision)`  [INFERRED] [semantically similar]
  CLAUDE.md → ARCHITECTURE.md
- `Modular Monolith directory structure` --semantically_similar_to--> `4-file domain module structure (schema/service/controller/routes/test)`  [INFERRED] [semantically similar]
  SKILLS.md → ARCHITECTURE.md
- `JWT verification middleware (getClaims/JWKS)` --semantically_similar_to--> `JWKS-based auth via supabaseAdmin.auth.getClaims`  [INFERRED] [semantically similar]
  docs/05-implementation.md → ARCHITECTURE.md
- `Auth Middleware (authenticate/optionalAuth/requireAdmin)` --semantically_similar_to--> `JWKS-based auth via supabaseAdmin.auth.getClaims`  [INFERRED] [semantically similar]
  SKILLS.md → ARCHITECTURE.md
- `Auth & Profile endpoint reference (/api/auth)` --semantically_similar_to--> `Backend-driven Google/Facebook OAuth (PKCE, state-in-redirect_to)`  [INFERRED] [semantically similar]
  docs/04-api-design.md → ARCHITECTURE.md

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

## Communities (149 total, 83 thin omitted)

### Community 0 - "Error Type Hierarchy"
Cohesion: 0.06
Nodes (52): AppError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, deleteAvatar() (+44 more)

### Community 1 - "Auth & Address Controller"
Cohesion: 0.05
Nodes (55): createAddress(), deleteAddress(), deleteAvatar(), forgotPassword(), getAddresses(), getMe(), login(), logout() (+47 more)

### Community 2 - "Express App Bootstrap & Swagger"
Cohesion: 0.06
Nodes (54): chat(), chatHealth(), getClient(), getOrCreateConversation(), loadRecentMessages(), maybeRefreshIntentSummary(), saveMessage(), touchConversation() (+46 more)

### Community 3 - "Chat Persistence Layer"
Cohesion: 0.08
Nodes (38): testSendEmail(), testSendSchema, router, cancelOrder(), claimOrders(), createOrder(), deleteOrder(), getOrderById() (+30 more)

### Community 4 - "Orders Controller"
Cohesion: 0.05
Nodes (42): @anthropic-ai/sdk, bcryptjs, compression, dotenv, drizzle-orm, express-rate-limit, helmet, jsonwebtoken (+34 more)

### Community 5 - "Package Metadata"
Cohesion: 0.05
Nodes (38): author, description, engines, node, license, main, name, scripts (+30 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (26): adjustInventory(), exportInventory(), getInventory(), getInventoryById(), getLowStockAlerts(), getMovements(), getVariantAvailability(), upsertInventory() (+18 more)

### Community 7 - "Inventory Controller"
Cohesion: 0.06
Nodes (35): drizzle-kit, devDependencies, drizzle-kit, pino-pretty, supertest, tsx, @types/bcryptjs, @types/compression (+27 more)

### Community 8 - "Dev Dependencies"
Cohesion: 0.12
Nodes (29): addItem(), clearCart(), createGuestSession(), getCart(), migrateCart(), removeItem(), resolveOwner(), updateItem() (+21 more)

### Community 9 - "Cart Controller"
Cohesion: 0.11
Nodes (30): adjustStock(), bulkCreateVariants(), createVariant(), deleteVariant(), getVariantById(), getVariants(), updateVariant(), router (+22 more)

### Community 10 - "Graphify Export & Traversal Features"
Cohesion: 0.06
Nodes (32): JWKS-based auth via supabaseAdmin.auth.getClaims, Backend-driven Google/Facebook OAuth (PKCE, state-in-redirect_to), Atomic guarded UPDATE stock accounting at checkout, OAuth top-level state param collision with GoTrue gotcha, Shared restoreOrderStock helper, getAddresses ORDER BY created_at ASC fix (card position swap bug), Historic double-counting bug: reserved_quantity incremented AND quantity decremented for same sale, FAQ: How to Track Order (+24 more)

### Community 11 - "TypeScript Compiler Config"
Cohesion: 0.07
Nodes (29): Graphify Skill Pointer (/graphify), FalkorDB Export / Push, MCP stdio Server (graphify.serve), Neo4j Export / Push, Token Reduction Benchmark, Wiki Export (--wiki), Monorepo / Multi-Subfolder Extraction, BFS / DFS Traversal Modes (+21 more)

### Community 12 - "Category/Product Routes & Tests"
Cohesion: 0.15
Nodes (15): app, app, app, cleanProducts(), client, db, brands, categories (+7 more)

### Community 13 - "Products Controller"
Cohesion: 0.14
Nodes (23): bulkDelete(), bulkUpdateStatus(), createProduct(), deleteProduct(), getFeaturedProducts(), getProductById(), getProductBySlug(), getProducts() (+15 more)

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
Cohesion: 0.17
Nodes (17): createCategory(), deleteCategory(), deleteCategoryImage(), getCategories(), getCategoryById(), updateCategory(), uploadCategoryImage(), router (+9 more)

### Community 18 - "Inventory Tests & Error Handler"
Cohesion: 0.18
Nodes (16): router, bulkUploadImages(), deleteImage(), getAllImagesAdmin(), getImageById(), getImages(), setPrimaryImage(), updateImage() (+8 more)

### Community 19 - "Categories Controller"
Cohesion: 0.22
Nodes (17): cancelOrder(), claimGuestOrders(), createOrder(), DbTransaction, fetchOrderItemsWithImages(), generateOrderNumber(), getOrderById(), getOrderByNumber() (+9 more)

### Community 20 - "Courier Webhook & Ship/Refresh Controller"
Cohesion: 0.21
Nodes (14): getCourierBalance(), isValidWebhookBearer(), receiveWebhook(), refreshOrderStatus(), shipOrder(), trackByCode(), CourierWebhookBody, courierWebhookSchema (+6 more)

### Community 21 - "Courier Service & Internal Poll Route"
Cohesion: 0.23
Nodes (12): pollCourierStatus(), CourierEffects, mapCourierStatus(), pollActiveShipments(), recordCourierEvent(), refreshOrderStatus(), shipOrder(), TERMINAL_COURIER_STATUSES (+4 more)

### Community 22 - "Auth & Orders Route Tests"
Cohesion: 0.13
Nodes (15): AI Shopping Assistant (RAG pipeline), AI chat / RAG module (chat + knowledge), AI Shopping Assistant Requirement, AI Chat Rebuilt as Full RAG Pipeline (Decision), AI Chat endpoint (/api/chat, SSE protocol), AI Chat RAG pipeline rebuild (from bare tool-use to full RAG), Lazy Anthropic client initialization (test-mockable), Chat request lifecycle (streaming, tool calls, history window) (+7 more)

### Community 23 - "App Bootstrap & Images Tests"
Cohesion: 0.13
Nodes (15): Confidence Score Rubric, Hyperedge Extraction Rule, Node ID Format Rule ({stem}_{entity}), semantically_similar_to Edge Rule, Extraction Subagent Prompt Template, build_merge() replace-on-re-extract (#1344), Graph Diff Reporting, --update Incremental Re-extraction (+7 more)

### Community 24 - "Variants Service & Schema"
Cohesion: 0.18
Nodes (15): /api/chat (SSE stream), /api/orders (transactional), /api/products (read + admin write), Chat service (Claude tool-use loop, true token streaming), Chat widget (Storefront, SSE stream), Chunk + Embed (Voyage AI), conversations + messages (multi-turn history / conversations table), get_my_orders tool (auth-gated only, scoped to req.user.id) (+7 more)

### Community 25 - "Workspace Architecture Overview"
Cohesion: 0.13
Nodes (14): addressType, chatRole, fulfillmentStatus, kbSourceType, movementReason, movementType, orderStatus, paymentMethod (+6 more)

### Community 26 - "Products Service"
Cohesion: 0.19
Nodes (9): express, ApiResponse, Express, PaginatedResponse, PaginationParams, Request, cleanupChatHistory(), router (+1 more)

### Community 27 - "Requirements Backlog & CI/CD Decisions"
Cohesion: 0.24
Nodes (8): authenticate(), optionalAuth(), requireAdmin(), verifyToken(), getDashboard(), router, getAdminDashboard(), supabaseAdmin

### Community 28 - "Non-Functional Requirements & Rate Limits"
Cohesion: 0.21
Nodes (7): app, TEST_ADDRESS, inventory, orderItems, orders, productVariants, profiles

### Community 29 - "RAG Chatbot Architecture Diagram"
Cohesion: 0.20
Nodes (12): CI/CD & two-environment model, Development workflow (build, test, micro-commit, no auto-deploy), Zod-validated env vars in src/app/config/index.ts crash-on-boot, Migration 039 kept out of production for two merges — CI silent-skip incident, Migration 039 silently skipped twice — RAG rollout incident, Rollout checklist (env vars, migrations, backfill, cron), CI Deploy Edge Functions Job (Stage 3), CI Migrate Job (Stage 2) (+4 more)

### Community 30 - "Railway Deployment Config"
Cohesion: 0.23
Nodes (5): envSchema, parsed, logger, sentryEnabled(), PORT

### Community 31 - "DB Sync Script"
Cohesion: 0.18
Nodes (11): Aurevo.BE (Express + TypeScript + Drizzle backend), Aurevo.UI (React storefront/admin), Modular Monolith + BFF pattern (chosen over microservices), 4-file domain module structure (schema/service/controller/routes/test), No Supabase SDK on frontend (single most important architectural decision), Supabase (Postgres 15 + Auth + Storage), Testing strategy (BE Vitest+Supertest, FE Vitest+MSW, E2E Playwright), Workspace-wide decisions (two-environment model, CI/CD, no-SDK, i18n, observability) (+3 more)

### Community 32 - "Auth Middleware"
Cohesion: 0.22
Nodes (7): allowedOrigins, app, options, swaggerSpec, router, router, router

### Community 33 - "Graphify Extraction Spec"
Cohesion: 0.24
Nodes (10): Return window (7 days, defective/damaged/different), Delivery time (2-3 days Dhaka, 3-5 outside, up to 7 remote), conversations table (chat sessions, retention-driving), kb_chunks table (RAG vector knowledge base, migration 039), messages table (chat turns, cascade delete), RAG data model (kb_chunks/conversations/messages, migration 039), Ingestion pipeline (ingestProducts/ingestPolicyDocs/upsertProductChunk), Policy-doc chunking dropped heading-only sections bug (fixed) (+2 more)

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
Cohesion: 0.24
Nodes (8): assertEnabled(), BalanceResponse, courierEnabled(), CreateOrderPayload, CreateOrderResponse, request(), StatusResponse, SteadfastConsignment

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (4): globalErrorHandler(), app, createVariantsApp(), createTestApp()

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (7): authLimiter, baseOptions, cartLimiter, chatLimiter, strictLimiter, trackingLimiter, uploadLimiter

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (5): router, app, createImagesApp(), TINY_GIF, productImages

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (6): content, fs, outPath, path, srcPath, tables

### Community 42 - "Community 42"
Cohesion: 0.32
Nodes (6): publicLimiter, validate(), zodFieldErrors(), router, getAllVariants(), getAllVariantsSchema

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (3): app, cartItems, guestSessions

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (7): Observability stack (pino, Sentry, health check, graceful shutdown), logger.ts/sentry.ts/health check/fail-fast boot, Health endpoint (/health, /api/health), Deep Health Check (GET /health, /api/health), Fail-Fast Boot + Graceful Shutdown, Sentry error tracking (initSentry, unexpected-only capture), Structured Logging (pino, pino-http)

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (7): Requirements Backlog, No Dedicated Staging Supabase Project (Decision), Testing: Vitest + Supertest Choice, Testing Philosophy: Real DB, No Mocks, CI/CD Pipeline (ci.yml), Load Testing Plan Context & Constraints, Files to Touch (Load Testing)

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (5): app, TEST_ADDRESS, userAddresses, MOCK_ADMIN_USER, MOCK_USER

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (6): Storefront Authentication Requirements, Auth Design (JWKS getClaims), Identity Linked Notice Template, Identity Unlinked Notice Template, MFA Factor Enrolled Notice Template, MFA Factor Unenrolled Notice Template

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (6): keywords, api, drizzle, ecommerce, node, supabase

### Community 51 - "Courier Internal Poll Tests"
Cohesion: 0.33
Nodes (3): app, TEST_ADDRESS, courierTrackingEvents

### Community 53 - "Community 53"
Cohesion: 0.47
Nodes (5): embed(), embedDocuments(), embedQuery(), VoyageEmbeddingsResponse, VoyageInputType

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (5): Data layer — 22 tables, 11 enums, RLS, service role key, Database Design overview (22 tables, 11 enums), Module Build Order & Rationale (Phase 0-10), Drizzle client singleton (src/db/index.ts), Module Build Order (Categories→...→AI Chat→Admin)

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (5): Backend: Modular Monolith (Express + TypeScript), RAG Chatbot Architecture Diagram (draft/duplicate of docs/images/rag-chatbot-architecture.svg, the canonical diagram referenced from docs/09-ai-chatbot-rag.md), Ingestion pipeline (offline, re-run after catalog changes), Runtime chat flow (every customer message), Supabase / PostgreSQL 15

### Community 56 - "Community 56"
Cohesion: 0.50
Nodes (4): FAQ: Out of Stock Items, Sizing: Between Sizes, Sizing: Finding the Right Fit, Sizing: How Sizes Are Shown (variants)

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): Tiered rate limiters (public/auth/cart/strict/upload/chat), Request lifecycle (middleware chain), Rate Limiters table

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): cartLimiter split from authLimiter (routine adds vs brute-force), POST /cart/items moved off authLimiter to own cartLimiter, API Rate Limits table

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (3): graphify claude install (CLAUDE.md integration), graphify hook install (post-commit auto-rebuild), Commit Hook / Native CLAUDE.md Integration

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): Payment: Cash on Delivery, Payment: Online Payment Option, Payment: Security (no card details stored)

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (3): Order Confirmation Email via Resend (Decision), Environment Variable Security, Rate-Limiter Bypass Design

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (3): fileParallelism: false in Vitest config (shared local Postgres), Tech Decisions at a Glance table, Tech Stack table (Drizzle, Zod, express-rate-limit, swagger)

## Ambiguous Edges - Review These
- `Admin User Role` → `Invite User Email Template`  [AMBIGUOUS]
  supabase/email-templates/invite-user.html · relation: conceptually_related_to
- `Storefront Authentication Requirements` → `MFA Factor Enrolled Notice Template`  [AMBIGUOUS]
  supabase/email-templates/mfa-enrolled.html · relation: conceptually_related_to
- `Storefront Authentication Requirements` → `MFA Factor Unenrolled Notice Template`  [AMBIGUOUS]
  supabase/email-templates/mfa-unenrolled.html · relation: conceptually_related_to
- `Profile & Addresses Requirements (BD shape)` → `Phone Number Changed Notice Template`  [AMBIGUOUS]
  supabase/email-templates/phone-changed.html · relation: conceptually_related_to
- `Historic double-counting bug: reserved_quantity incremented AND quantity decremented for same sale` → `Transactional Stock Reservation (Orders, stock/reservedStock update)`  [AMBIGUOUS]
  docs/05-implementation.md · relation: conceptually_related_to

## Knowledge Gaps
- **408 isolated node(s):** `$schema`, `builder`, `startCommand`, `healthcheckPath`, `healthcheckTimeout` (+403 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **83 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **What is the exact relationship between `Historic double-counting bug: reserved_quantity incremented AND quantity decremented for same sale` and `Transactional Stock Reservation (Orders, stock/reservedStock update)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `express` connect `Products Service` to `Auth Middleware`, `Auth & Address Controller`, `Error Type Hierarchy`, `Express App Bootstrap & Swagger`, `Orders Controller`, `Chat Persistence Layer`, `Runtime Dependencies`, `Community 38`, `Dev Dependencies`, `Community 40`, `Community 42`, `Cart Controller`, `Products Controller`, `Product Images Admin API`, `Community 50`, `Inventory Tests & Error Handler`, `Requirements Backlog & CI/CD Decisions`, `Railway Deployment Config`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `keywords` connect `Community 50` to `Products Service`, `Package Metadata`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._