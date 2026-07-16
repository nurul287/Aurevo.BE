# Graph Report - .  (2026-07-16)

## Corpus Check
- 70 files · ~106,354 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1139 nodes · 1945 edges · 136 communities (67 shown, 69 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.85)
- Token cost: 400,664 input · 0 output

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
- Storefront Auth & BD Address Requirements
- Product Variants Controller
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
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
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
- Community 132

## God Nodes (most connected - your core abstractions)
1. `express` - 40 edges
2. `scripts` - 30 edges
3. `db` - 21 edges
4. `products` - 21 edges
5. `compilerOptions` - 17 edges
6. `streamChat()` - 16 edges
7. `productVariants` - 16 edges
8. `graphify (knowledge graph tool)` - 15 edges
9. `Aurevo.BE (Express + TypeScript + Drizzle)` - 15 edges
10. `authenticate()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AI Chat Module (Phase 10, Claude Tool Use, SSE)` --semantically_similar_to--> `AI Chat / RAG Module`  [INFERRED] [semantically similar]
  SKILLS.md → CLAUDE.md
- `OAuth state carried inside redirect_to (GoTrue owns top-level state)` --semantically_similar_to--> `Backend-Driven OAuth (Google/Facebook, PKCE)`  [INFERRED] [semantically similar]
  CLAUDE.md → ARCHITECTURE.md
- `Atomic Guarded UPDATE Stock Decrement` --semantically_similar_to--> `Atomic Stock Accounting (guarded UPDATE)`  [INFERRED] [semantically similar]
  CLAUDE.md → ARCHITECTURE.md
- `Tiered Rate Limiters Table` --semantically_similar_to--> `Rate Limiters Table`  [INFERRED] [semantically similar]
  ARCHITECTURE.md → SKILLS.md
- `Rate Limiters (authLimiter vs cartLimiter split)` --semantically_similar_to--> `Tiered Rate Limiters Table`  [INFERRED] [semantically similar]
  CLAUDE.md → ARCHITECTURE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Order Confirmation Email Feature (Resend)** — architecture_order_confirmation_email, claude_order_confirmation_email, readme_order_confirmation_email, content_policies_payment_order_confirmation [INFERRED 0.85]
- **Tiered Rate Limiter Scheme** — architecture_rate_limiters, claude_rate_limiters, skills_rate_limiters [INFERRED 0.85]
- **CI/CD Pipeline Stages (test -> migrate -> deploy-functions)** — github_workflows_ci_test_job, github_workflows_ci_migrate_job, github_workflows_ci_deploy_functions_job, architecture_ci_cd [EXTRACTED 1.00]
- **Aurevo Branded Supabase Auth Email Templates** — supabase_email_templates_change_email_template, supabase_email_templates_confirm_signup_template, supabase_email_templates_email_address_changed_template, supabase_email_templates_identity_linked_template, supabase_email_templates_identity_unlinked_template, supabase_email_templates_invite_user_template, supabase_email_templates_magic_link_template, supabase_email_templates_mfa_enrolled_template, supabase_email_templates_mfa_unenrolled_template, supabase_email_templates_phone_changed_template, supabase_email_templates_reauthentication_template [INFERRED 0.90]
- **Dual-Ledger Stock Consistency (inventory + product_variants)** — docs_03_database_design_productvariantstable, docs_03_database_design_inventorytable, docs_05_implementation_inventoryupsertsync, docs_05_implementation_transactionalstockreservation, docs_04_api_design_inventoryendpoint [INFERRED 0.85]
- **RAG Chatbot Feature Pipeline** — docs_09_ai_chatbot_rag_ingestionpipeline, docs_09_ai_chatbot_rag_datamodel, docs_09_ai_chatbot_rag_chatrequestlifecycle, docs_09_ai_chatbot_rag_guardrails, docs_09_ai_chatbot_rag_productcardmatching [INFERRED 0.85]
- **Offline ingestion pipeline (products + policy docs to kb_chunks)** — docs_images_rag_chatbot_architecture_products_db, docs_images_rag_chatbot_architecture_policy_faq_docs, docs_images_rag_chatbot_architecture_chunk_embed, docs_images_rag_chatbot_architecture_kb_chunks [INFERRED 0.85]
- **Runtime chat tool-use loop (chat service + three tools)** — docs_images_rag_chatbot_architecture_chat_service, docs_images_rag_chatbot_architecture_search_knowledge, docs_images_rag_chatbot_architecture_get_product_details, docs_images_rag_chatbot_architecture_get_my_orders [INFERRED 0.85]

## Communities (136 total, 69 thin omitted)

### Community 0 - "Error Type Hierarchy"
Cohesion: 0.06
Nodes (52): AppError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, deleteAvatar() (+44 more)

### Community 1 - "Auth & Address Controller"
Cohesion: 0.06
Nodes (54): createAddress(), deleteAddress(), deleteAvatar(), forgotPassword(), getAddresses(), getMe(), login(), logout() (+46 more)

### Community 2 - "Express App Bootstrap & Swagger"
Cohesion: 0.06
Nodes (34): express, envSchema, parsed, options, swaggerSpec, ApiResponse, Express, PaginatedResponse (+26 more)

### Community 3 - "Chat Persistence Layer"
Cohesion: 0.07
Nodes (46): getClient(), getOrCreateConversation(), loadRecentMessages(), maybeRefreshIntentSummary(), saveMessage(), touchConversation(), buildSystemPrompt(), buildToolList() (+38 more)

### Community 4 - "Orders Controller"
Cohesion: 0.08
Nodes (44): cancelOrder(), claimOrders(), createOrder(), deleteOrder(), getOrderById(), getOrderByNumber(), getOrders(), getOrderStats() (+36 more)

### Community 5 - "Package Metadata"
Cohesion: 0.04
Nodes (44): author, description, engines, node, keywords, license, main, name (+36 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (42): @anthropic-ai/sdk, bcryptjs, compression, dotenv, drizzle-orm, express-rate-limit, helmet, jsonwebtoken (+34 more)

### Community 7 - "Inventory Controller"
Cohesion: 0.10
Nodes (25): adjustInventory(), exportInventory(), getInventory(), getInventoryById(), getLowStockAlerts(), getMovements(), getVariantAvailability(), upsertInventory() (+17 more)

### Community 8 - "Dev Dependencies"
Cohesion: 0.06
Nodes (35): drizzle-kit, devDependencies, drizzle-kit, pino-pretty, supertest, tsx, @types/bcryptjs, @types/compression (+27 more)

### Community 9 - "Cart Controller"
Cohesion: 0.13
Nodes (28): addItem(), clearCart(), createGuestSession(), getCart(), migrateCart(), removeItem(), resolveOwner(), updateItem() (+20 more)

### Community 10 - "Graphify Export & Traversal Features"
Cohesion: 0.07
Nodes (29): Graphify Skill Pointer (/graphify), FalkorDB Export / Push, MCP stdio Server (graphify.serve), Neo4j Export / Push, Token Reduction Benchmark, Wiki Export (--wiki), Monorepo / Multi-Subfolder Extraction, BFS / DFS Traversal Modes (+21 more)

### Community 11 - "TypeScript Compiler Config"
Cohesion: 0.08
Nodes (24): dist, ES2022, node_modules, src/*, compilerOptions, baseUrl, declaration, declarationMap (+16 more)

### Community 12 - "Category/Product Routes & Tests"
Cohesion: 0.14
Nodes (15): app, router, app, router, app, cleanProducts(), brands, categories (+7 more)

### Community 13 - "Products Controller"
Cohesion: 0.15
Nodes (22): bulkDelete(), bulkUpdateStatus(), createProduct(), deleteProduct(), getFeaturedProducts(), getProductById(), getProductBySlug(), getProducts() (+14 more)

### Community 14 - "Meta CAPI Webhook Function"
Cohesion: 0.17
Nodes (22): AdminClient, corsHeaders, createAdminClient(), DbWebhookPayload, getEnv(), handlePurchase(), jsonResponse(), loadOrderContext() (+14 more)

### Community 15 - "Drizzle Schema Relations"
Cohesion: 0.09
Nodes (21): addressesRelations, brandsRelations, cartItemsRelations, categoriesRelations, inventoryMovementsRelations, inventoryRelations, metaCapiSentRelations, orderItemsRelations (+13 more)

### Community 16 - "Admin Dashboard & Enums"
Cohesion: 0.12
Nodes (18): getDashboard(), getAdminDashboard(), addressType, chatRole, fulfillmentStatus, kbSourceType, metaCapiSent, movementReason (+10 more)

### Community 17 - "Product Images Admin API"
Cohesion: 0.18
Nodes (16): router, bulkUploadImages(), deleteImage(), getAllImagesAdmin(), getImageById(), getImages(), setPrimaryImage(), updateImage() (+8 more)

### Community 18 - "Inventory Tests & Error Handler"
Cohesion: 0.14
Nodes (9): globalErrorHandler(), router, app, router, app, createVariantsApp(), inventory, inventoryMovements (+1 more)

### Community 19 - "Categories Controller"
Cohesion: 0.18
Nodes (16): createCategory(), deleteCategory(), deleteCategoryImage(), getCategories(), getCategoryById(), updateCategory(), uploadCategoryImage(), upload (+8 more)

### Community 20 - "Storefront Auth & BD Address Requirements"
Cohesion: 0.11
Nodes (18): Storefront Authentication Requirements, Profile & Addresses Requirements (BD shape), Auth Design (JWKS getClaims), Row-Level Security Policies, user_addresses Table (BD shape), Auth & Profile Endpoints, BD-Shaped Saved Addresses, Chat Guardrails (auth-gated get_my_orders) (+10 more)

### Community 21 - "Product Variants Controller"
Cohesion: 0.21
Nodes (15): adjustStock(), bulkCreateVariants(), createVariant(), deleteVariant(), getVariantById(), getVariants(), updateVariant(), adjustStockSchema (+7 more)

### Community 22 - "Auth & Orders Route Tests"
Cohesion: 0.12
Nodes (10): router, app, TEST_ADDRESS, router, app, TEST_ADDRESS, productReviews, userAddresses (+2 more)

### Community 23 - "App Bootstrap & Images Tests"
Cohesion: 0.14
Nodes (9): allowedOrigins, app, router, app, createImagesApp(), TINY_GIF, client, db (+1 more)

### Community 24 - "Variants Service & Schema"
Cohesion: 0.18
Nodes (14): AdjustStockInput, BulkCreateVariantsInput, CreateVariantInput, UpdateVariantInput, adjustStock(), assertProductExists(), bulkCreateVariants(), createVariant() (+6 more)

### Community 25 - "Workspace Architecture Overview"
Cohesion: 0.16
Nodes (14): Aurevo.BE (Express + TypeScript + Drizzle), Aurevo.UI (React 19 + Vite), Backend-Driven OAuth (Google/Facebook, PKCE), Codebase Knowledge Graph (graphify-out/graph.json), Modular Monolith + BFF Pattern, Domain Module 4-File Pattern (schema/service/controller/routes), No Supabase SDK on Frontend (BFF auth), Observability (pino, Sentry, /api/health, graceful shutdown) (+6 more)

### Community 26 - "Products Service"
Cohesion: 0.27
Nodes (7): bulkUpdateStatus(), createProduct(), deleteProduct(), getProductById(), reembedProduct(), updateProduct(), productVariants

### Community 27 - "Requirements Backlog & CI/CD Decisions"
Cohesion: 0.20
Nodes (10): Requirements Backlog, No Dedicated Staging Supabase Project (Decision), Testing: Vitest + Supertest Choice, Lazy Anthropic Client Initialization (Decision), Testing Philosophy: Real DB, No Mocks, CI/CD Pipeline (ci.yml), Load Testing Plan Context & Constraints, Files to Touch (Load Testing) (+2 more)

### Community 28 - "Non-Functional Requirements & Rate Limits"
Cohesion: 0.20
Nodes (10): Non-Functional Requirements, Order Confirmation Email via Resend (Decision), Request Lifecycle, Rate Limits Reference, Foundation Layer (Phase 0), Orders use authLimiter not strictLimiter (Decision), Sentry Error Tracking, Environment Variable Security (+2 more)

### Community 29 - "RAG Chatbot Architecture Diagram"
Cohesion: 0.20
Nodes (10): Chat service (Claude, tool-use loop, true token streaming), Chat widget (storefront, SSE stream), Chunk + embed (Voyage AI), conversations + messages (multi-turn history), get_my_orders (auth-gated only, scoped to req.user.id), get_product_details (live DB lookup, current stock & price), kb_chunks (pgvector store, products + policies), Policy & FAQ docs (Markdown, new content) (+2 more)

### Community 30 - "Railway Deployment Config"
Cohesion: 0.20
Nodes (9): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, startCommand (+1 more)

### Community 31 - "DB Sync Script"
Cohesion: 0.22
Nodes (6): DUMP_DEFAULT, ENV_LOCAL, restoreLocalData(), ROOT, run(), WIPE_SCRIPT

### Community 32 - "Auth Middleware"
Cohesion: 0.31
Nodes (6): authenticate(), optionalAuth(), requireAdmin(), verifyToken(), router, supabaseAdmin

### Community 33 - "Graphify Extraction Spec"
Cohesion: 0.22
Nodes (9): Confidence Score Rubric, Hyperedge Extraction Rule, semantically_similar_to Edge Rule, Extraction Subagent Prompt Template, Structural (AST) Extraction - Part A, No API Key Required Policy, Semantic Extraction Cache (check_semantic_cache), Semantic (LLM) Extraction - Part B (+1 more)

### Community 34 - "Cart Route Tests"
Cohesion: 0.22
Nodes (4): router, app, cartItems, guestSessions

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (8): AI Shopping Assistant (SSE + Claude tool use), AI Chat / RAG Module, Auto-Embed on Product Write (not CDC), Sliding Window + Rolling Intent Summary, Product Card Matching Against Reply Text, Conversation Retention (90d logged-in / 48h guest), AI Chat Module (Phase 10, Claude Tool Use, SSE), Module Build Order (Categories -> ... -> AI Chat)

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (8): CI/CD Pipeline (test / migrate / deploy-functions), CI deploy-functions job (Supabase Edge Functions), fetch-depth:0 required for paths-filter (migration 039 incident), CI migrate job (supabase db push), Railway native "Wait for CI" deploy trigger, CI test job (build + integration tests), Merge main back into dev workflow, Railway Deployment (Wait for CI)

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (6): content, fs, outPath, path, srcPath, tables

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (6): authLimiter, baseOptions, cartLimiter, chatLimiter, strictLimiter, uploadLimiter

### Community 39 - "Community 39"
Cohesion: 0.32
Nodes (6): publicLimiter, validate(), zodFieldErrors(), router, getAllVariants(), getAllVariantsSchema

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (7): FAQ: Change or Cancel Order, Returns: Exchanges (return + new order), Returns: How to Start a Return, Returns: Non-Returnable Items, Returns: Refunds (7-10 business days), Returns: Return Window (7 days), Sizing: Exchanging for a Different Size

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (6): Data Layer (19 tables, 9 enums, RLS), Atomic Stock Accounting (guarded UPDATE), Supabase (Postgres 15 + Auth + Storage), user_addresses Bangladesh Schema (migration 038), Saved Addresses (user_addresses, ORDER BY created_at ASC), Atomic Guarded UPDATE Stock Decrement

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (6): Order Confirmation Email via Resend, Order Confirmation Email (Resend, fire-and-forget), Payment: Order Confirmation Email, Key Features (catalog, cart, orders, inventory, auth, i18n, AI, admin), Order Confirmation Email via Resend (orders@aurevofashion.store), Tech Decisions at a Glance

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (6): ORM: Drizzle (introspect-first) Choice, Database: Supabase (PostgreSQL 15) Choice, Database Design Overview, FK-Safe Cleanup Order, RAG Data Model (kb_chunks, conversations, messages), pgvector Store

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (5): Tiered Rate Limiters Table, Observability (pino, Sentry, /api/health, SIGTERM drain), Rate Limiters (authLimiter vs cartLimiter split), Auth Middleware (authenticate/optionalAuth/requireAdmin), Rate Limiters Table

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (5): Node ID Format Rule ({stem}_{entity}), build_merge() replace-on-re-extract (#1344), Graph Diff Reporting, --update Incremental Re-extraction, --directed flag (directed graph)

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (5): FAQ: How to Track Order, Shipping: Cost Calculated at Checkout, Shipping: Delivery Areas (64 districts), Shipping: Delivery Time (2-7 days), Shipping: Order Tracking Number

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (5): AI Shopping Assistant Requirement, AI Chat Rebuilt as Full RAG Pipeline (Decision), Frontend Chat Widget (ai-chat-widget.tsx), AI Chatbot RAG Overview, Retention & Cleanup (48h guest / 90d user)

### Community 49 - "Community 49"
Cohesion: 0.40
Nodes (5): inventory Table (generated available_quantity), Inventory Endpoints, CORS exposedHeaders (Content-Disposition), Inventory Upsert Syncs Both Ledgers, Server-Side XLSX Export

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (5): orders Table, product_variants Table (stock design), Orders Endpoints, Transactional Stock Reservation (Orders), Synthetic-Traffic Tagging (X-Load-Test-Run-Id)

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (5): Health Endpoint, Deep Health Check, Fail-Fast Boot + Graceful Shutdown, Aurevo.BE — Railway Deployment, Rollout Checklist (not yet in production)

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (4): FAQ: Out of Stock Items, Sizing: Between Sizes, Sizing: Finding the Right Fit, Sizing: How Sizes Are Shown (variants)

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (4): Module Structure (4-file pattern), Build Order & Rationale, Git History (Micro-Commits), Coverage by Module (216 tests)

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (4): AppError Classes, Error Codes Table, Modular Monolith Directory Structure, Response Shape Standard

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (3): graphify claude install (CLAUDE.md integration), graphify hook install (post-commit auto-rebuild), Commit Hook / Native CLAUDE.md Integration

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (3): Payment: Cash on Delivery, Payment: Online Payment Option, Payment: Security (no card details stored)

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): Error Hierarchy, Error Code Reference, HTTP Status Code Reference

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): System Diagram, Production Deployment Infrastructure Map, RAG Configuration (env vars)

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (3): AI Chat Endpoint (SSE, 3-tool), AI Chat Agentic Tool Use Loop, Chat Request Lifecycle

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): Product Images Endpoints, Product Variants Endpoints, Nested Router Pattern (mergeParams)

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (3): fileParallelism: false in Vitest config (Decision), Test Setup (Vitest 4, Supertest, local Docker), Execution Runbook

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (3): Composite Filter Pattern (list endpoints), Controller Pattern, Zod Validation Pattern

## Ambiguous Edges - Review These
- `AI Shopping Assistant (SSE + Claude tool use)` → `AI Chat / RAG Module`  [AMBIGUOUS]
  CLAUDE.md · relation: conceptually_related_to
- `Admin User Role` → `Invite User Email Template`  [AMBIGUOUS]
  supabase/email-templates/invite-user.html · relation: conceptually_related_to
- `Storefront Authentication Requirements` → `MFA Factor Enrolled Notice Template`  [AMBIGUOUS]
  supabase/email-templates/mfa-enrolled.html · relation: conceptually_related_to
- `Storefront Authentication Requirements` → `MFA Factor Unenrolled Notice Template`  [AMBIGUOUS]
  supabase/email-templates/mfa-unenrolled.html · relation: conceptually_related_to
- `Profile & Addresses Requirements (BD shape)` → `Phone Number Changed Notice Template`  [AMBIGUOUS]
  supabase/email-templates/phone-changed.html · relation: conceptually_related_to
- `Database Design Overview` → `RAG Data Model (kb_chunks, conversations, messages)`  [AMBIGUOUS]
  docs/09-ai-chatbot-rag.md · relation: conceptually_related_to
- `AI Chat Endpoint (SSE, 3-tool)` → `Chat Request Lifecycle`  [AMBIGUOUS]
  docs/04-api-design.md · relation: conceptually_related_to
- `AI Chat Agentic Tool Use Loop` → `Chat Request Lifecycle`  [AMBIGUOUS]
  docs/05-implementation.md · relation: conceptually_related_to

## Knowledge Gaps
- **358 isolated node(s):** `$schema`, `builder`, `startCommand`, `healthcheckPath`, `healthcheckTimeout` (+353 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AI Shopping Assistant (SSE + Claude tool use)` and `AI Chat / RAG Module`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Admin User Role` and `Invite User Email Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Storefront Authentication Requirements` and `MFA Factor Enrolled Notice Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Storefront Authentication Requirements` and `MFA Factor Unenrolled Notice Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Profile & Addresses Requirements (BD shape)` and `Phone Number Changed Notice Template`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Database Design Overview` and `RAG Data Model (kb_chunks, conversations, messages)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `AI Chat Endpoint (SSE, 3-tool)` and `Chat Request Lifecycle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._