# Graph Report - .  (2026-07-26)

## Corpus Check
- 5 files · ~280,393 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1593 nodes · 2558 edges · 277 communities (83 shown, 194 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.81)
- Token cost: 121,163 input · 0 output

## Community Hubs (Navigation)
- Bulk Import Module (routes/controller/schema)
- Auth Controller (login/OAuth/addresses)
- App Bootstrap (Express app + config + Swagger)
- Knowledge Service (RAG embedding/retrieval)
- Rate Limiters
- Admin Module + Shared API Types
- Orders Controller + Internal Email Test
- Production Dependencies
- Auth Middleware + Variants Admin Routes
- Courier Service (Steadfast tracking)
- Dev Dependencies
- Auth/Brands Test Suites
- Inventory Controller
- Cart Controller
- npm Scripts (db/build tooling)
- Bulk Import Worker Logic
- Admin Service + Courier Tests
- Graphify Skill Doc (top-level)
- TypeScript Config
- Products Controller
- Drizzle Relations
- Supabase Edge Function (meta-conversions)
- Images Service
- Products Test Suite
- Brands/Categories Service
- Categories Controller
- AppError Hierarchy
- Brands Controller/Routes
- Orders Schema (Zod)
- RAG Chat Architecture (endpoints + flow)
- Invoice PDF Generation (pdfkit + fonts + logo)
- System Architecture Overview
- CI/CD Two-Environment Model
- RAG Chat Runtime Flow
- Railway Deployment Config
- DB Sync Script (prod dump/restore)
- Graphify Export Options Doc
- package.json Metadata
- Go-Live Decisions Log
- Catalog Restore Build Script
- Inventory Test Suite
- Modular Monolith + BFF Pattern
- AI Chat / RAG Module Overview
- RAG Backlog & Known Limitations
- Chat Request Lifecycle & Product Card Matching
- FAQ Policy Doc
- Returns & Exchanges Policy Doc
- Variants Test Suite
- Shared Helper Utilities
- Courier Tracking Implementation
- Backend-Driven Auth/OAuth Design
- Tech Stack Decisions
- Graphify Query/Path/Explain Doc
- Payment Methods Policy Doc
- Shipping Policy Doc
- Sizing Guide Policy Doc
- Project Keywords
- Rate Limiter Design Decisions
- Retrieval/Answer Eval Harnesses
- CI Migration paths-filter Incident
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
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 237
- Community 238
- Community 239
- Community 240
- Community 241
- Community 242
- Community 243
- Community 244
- Community 245
- Community 246
- Community 247
- Community 248
- Community 249
- Community 250
- Community 252
- Community 254
- Community 255
- Community 256
- Community 257
- Community 258
- Community 259
- Community 260
- Community 261
- Community 262
- Community 265
- Community 266
- Community 267
- Community 268
- Community 269
- Community 270
- Community 271
- Community 272
- Community 273
- Community 274
- Community 275

## God Nodes (most connected - your core abstractions)
1. `express` - 43 edges
2. `scripts` - 34 edges
3. `products` - 28 edges
4. `Aurevo.BE CLAUDE.md` - 22 edges
5. `Aurevo.BE README.md` - 21 edges
6. `productVariants` - 20 edges
7. `DB` - 19 edges
8. `compilerOptions` - 17 edges
9. `AppError` - 14 edges
10. `streamChat()` - 14 edges

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
- **RAG Retrieval Quality Rollout (eval-gated hybrid+rerank)** — docs_09_ai_chatbot_rag_retrieval_evaluation, docs_09_ai_chatbot_rag_hybrid_rerank_retrieval, claude_retrieval_hybrid_rerank_default, docs_09_ai_chatbot_rag_planned_improvements [INFERRED 0.85]
- **Atomic Stock Decrement Pattern Across Docs** — architecture_stock_accounting, claude_stock_accounting_bug_history, docs_05_implementation_transactional_stock_decrement, docs_03_database_design_product_variants_table [INFERRED 0.85]
- **Ingestion pipeline components** — docs_images_rag_chatbot_archticture_ingestion_pipeline, docs_images_rag_chatbot_archticture_policy_faq_docs, docs_images_rag_chatbot_archticture_products_db, docs_images_rag_chatbot_archticture_chunk_embed, docs_images_rag_chatbot_archticture_kb_chunks [EXTRACTED 1.00]
- **Runtime chat flow components** — docs_images_rag_chatbot_archticture_runtime_chat_flow, docs_images_rag_chatbot_archticture_chat_service, docs_images_rag_chatbot_archticture_chat_widget, docs_images_rag_chatbot_archticture_get_product_details, docs_images_rag_chatbot_archticture_get_my_orders, docs_images_rag_chatbot_archticture_search_knowledge, docs_images_rag_chatbot_archticture_conversations_messages [EXTRACTED 1.00]
- **Backend modular monolith endpoints** — docs_images_rag_chatbot_archticture_backend_modular_monolith, docs_images_rag_chatbot_archticture_api_products, docs_images_rag_chatbot_archticture_api_orders, docs_images_rag_chatbot_archticture_api_chat [EXTRACTED 1.00]
- **Supabase / PostgreSQL 15 tables** — docs_images_rag_chatbot_archticture_supabase_postgresql, docs_images_rag_chatbot_archticture_products_table, docs_images_rag_chatbot_archticture_orders_table, docs_images_rag_chatbot_archticture_conversations_messages, docs_images_rag_chatbot_archticture_kb_chunks [EXTRACTED 1.00]
- **Aurevo Branded Supabase Auth Email Templates** — supabase_email_templates_change_email_template, supabase_email_templates_confirm_signup_template, supabase_email_templates_email_address_changed_template, supabase_email_templates_identity_linked_template, supabase_email_templates_identity_unlinked_template, supabase_email_templates_invite_user_template, supabase_email_templates_magic_link_template, supabase_email_templates_mfa_enrolled_template, supabase_email_templates_mfa_unenrolled_template, supabase_email_templates_phone_changed_template, supabase_email_templates_reauthentication_template [INFERRED 0.90]
- **Offline ingestion pipeline (products + policy docs to kb_chunks)** — docs_images_rag_chatbot_architecture_products_db, docs_images_rag_chatbot_architecture_policy_faq_docs, docs_images_rag_chatbot_architecture_chunk_embed, docs_images_rag_chatbot_architecture_kb_chunks [INFERRED 0.85]
- **Runtime chat tool-use loop (chat service + three tools)** — docs_images_rag_chatbot_architecture_chat_service, docs_images_rag_chatbot_architecture_search_knowledge, docs_images_rag_chatbot_architecture_get_product_details, docs_images_rag_chatbot_architecture_get_my_orders [INFERRED 0.85]

## Communities (277 total, 194 thin omitted)

### Community 0 - "Bulk Import Module (routes/controller/schema)"
Cohesion: 0.06
Nodes (52): AppError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, UpstreamServiceError, ValidationError (+44 more)

### Community 1 - "Auth Controller (login/OAuth/addresses)"
Cohesion: 0.05
Nodes (52): express, ApiResponse, Express, PaginatedResponse, PaginationParams, Request, getCourierBalance(), isValidWebhookBearer() (+44 more)

### Community 2 - "App Bootstrap (Express app + config + Swagger)"
Cohesion: 0.06
Nodes (49): getAiMetricsController(), getDashboard(), router, aggregate(), AnswerCaseResult, AnswerEvalSummary, buildJudgePrompt(), clampScore() (+41 more)

### Community 3 - "Knowledge Service (RAG embedding/retrieval)"
Cohesion: 0.06
Nodes (41): xlsx, downloadTemplate(), parseCandidateArray(), SPREADSHEET_EXTENSIONS, uploadImport(), validateCandidate(), genderEnum, GetImportJobsQuery (+33 more)

### Community 4 - "Rate Limiters"
Cohesion: 0.08
Nodes (42): testSendEmail(), testSendSchema, router, cancelOrder(), claimOrders(), createOrder(), deleteOrder(), getOrderById() (+34 more)

### Community 5 - "Admin Module + Shared API Types"
Cohesion: 0.04
Nodes (48): author, description, engines, node, keywords, license, main, name (+40 more)

### Community 6 - "Orders Controller + Internal Email Test"
Cohesion: 0.05
Nodes (45): AI Shopping Assistant RAG Pipeline, Aurevo Fashion Platform, Modular Monolith + BFF Pattern, Order Invoice PDF (pdfkit), Atomic Guarded Stock Decrement, Noto Sans Bengali Font, SIL Open Font License v1.1, Aurevo Wordmark Logo (black SVG) (+37 more)

### Community 7 - "Production Dependencies"
Cohesion: 0.05
Nodes (39): drizzle-kit, devDependencies, drizzle-kit, pino-pretty, supertest, tsx, @types/bcryptjs, @types/compression (+31 more)

### Community 8 - "Auth Middleware + Variants Admin Routes"
Cohesion: 0.10
Nodes (25): adjustInventory(), exportInventory(), getInventory(), getInventoryById(), getLowStockAlerts(), getMovements(), getVariantAvailability(), upsertInventory() (+17 more)

### Community 9 - "Courier Service (Steadfast tracking)"
Cohesion: 0.11
Nodes (31): adjustStock(), bulkCreateVariants(), createVariant(), deleteVariant(), getAllVariants(), getVariantById(), getVariants(), updateVariant() (+23 more)

### Community 10 - "Dev Dependencies"
Cohesion: 0.13
Nodes (28): addItem(), clearCart(), createGuestSession(), getCart(), migrateCart(), removeItem(), resolveOwner(), updateItem() (+20 more)

### Community 11 - "Auth/Brands Test Suites"
Cohesion: 0.12
Nodes (15): router, app, app, app, app, cleanProducts(), supabaseAdmin, createTestApp() (+7 more)

### Community 12 - "Inventory Controller"
Cohesion: 0.14
Nodes (23): bulkDelete(), bulkUpdateStatus(), createProduct(), deleteProduct(), getFeaturedProducts(), getProductById(), getProductBySlug(), getProducts() (+15 more)

### Community 13 - "Cart Controller"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 14 - "npm Scripts (db/build tooling)"
Cohesion: 0.08
Nodes (24): dist, ES2022, node_modules, src/*, compilerOptions, baseUrl, declaration, declarationMap (+16 more)

### Community 15 - "Bulk Import Worker Logic"
Cohesion: 0.08
Nodes (24): addressesRelations, brandsRelations, cartItemsRelations, categoriesRelations, inventoryMovementsRelations, inventoryRelations, metaCapiSentRelations, orderItemsRelations (+16 more)

### Community 16 - "Admin Service + Courier Tests"
Cohesion: 0.13
Nodes (13): allowedOrigins, app, envSchema, parsed, options, swaggerSpec, app, client (+5 more)

### Community 17 - "Graphify Skill Doc (top-level)"
Cohesion: 0.11
Nodes (18): cleanupChatHistory(), router, deleteOldChatMetrics(), addressType, chatMetrics, chatRole, conversations, fulfillmentStatus (+10 more)

### Community 18 - "TypeScript Config"
Cohesion: 0.17
Nodes (22): AdminClient, corsHeaders, createAdminClient(), DbWebhookPayload, getEnv(), handlePurchase(), jsonResponse(), loadOrderContext() (+14 more)

### Community 19 - "Products Controller"
Cohesion: 0.17
Nodes (21): Bulk Product Import module, Idempotent re-import via products.external_id/source unique constraint, Admin UI component (/admin/imports, Aurevo.UI), Category mapping (src/category-map.ts, keyword-based), import_jobs table, Import Pipeline component (Aurevo.BE), import_rows table, Known Limitations / Backlog (Content-Disposition CORS, Redis outage gap, scraper Shopify-only, no admin audit UI) (+13 more)

### Community 20 - "Drizzle Relations"
Cohesion: 0.17
Nodes (17): createCategory(), deleteCategory(), deleteCategoryImage(), getCategories(), getCategoryById(), updateCategory(), uploadCategoryImage(), router (+9 more)

### Community 21 - "Supabase Edge Function (meta-conversions)"
Cohesion: 0.18
Nodes (16): router, bulkUploadImages(), deleteImage(), getAllImagesAdmin(), getImageById(), getImages(), setPrimaryImage(), updateImage() (+8 more)

### Community 22 - "Images Service"
Cohesion: 0.22
Nodes (17): cancelOrder(), claimGuestOrders(), createOrder(), DbTransaction, fetchOrderItemsWithImages(), generateOrderNumber(), getOrderById(), getOrderByNumber() (+9 more)

### Community 23 - "Products Test Suite"
Cohesion: 0.13
Nodes (9): app, TEST_ADDRESS, app, TEST_ADDRESS, inventory, orderItems, productReviews, productVariants (+1 more)

### Community 24 - "Brands/Categories Service"
Cohesion: 0.19
Nodes (17): createAddress(), deleteAddress(), deleteAvatar(), forgotPassword(), getAddresses(), getMe(), login(), logout() (+9 more)

### Community 25 - "Categories Controller"
Cohesion: 0.17
Nodes (17): Candidate, candidateColumns, keywordSearch(), KnowledgeSourceType, POLICY_DOCS_DIR, rerankCandidates(), retrieve(), RetrievedChunk (+9 more)

### Community 26 - "AppError Hierarchy"
Cohesion: 0.14
Nodes (9): RefreshTokenInput, ResendConfirmationInput, UpdateAddressInput, forgotPassword(), login(), mapAuthError(), register(), resendConfirmation() (+1 more)

### Community 27 - "Brands Controller/Routes"
Cohesion: 0.19
Nodes (12): fetchAndRehostImage(), mapWithConcurrency(), processRow(), runImportJob(), syncVariant(), ONE_PX_PNG, generateUniqueProductSlug(), batchUpsertProductChunks() (+4 more)

### Community 28 - "Orders Schema (Zod)"
Cohesion: 0.12
Nodes (16): addressIdSchema, CreateAddressInput, createAddressSchema, ForgotPasswordInput, forgotPasswordSchema, LoginInput, loginSchema, refreshTokenSchema (+8 more)

### Community 29 - "RAG Chat Architecture (endpoints + flow)"
Cohesion: 0.18
Nodes (13): buildProductChunkText(), buildVariantSummary(), deleteProductChunk(), loadProductForEmbedding(), upsertProductChunk(), bulkDelete(), bulkUpdateStatus(), createProduct() (+5 more)

### Community 30 - "Invoice PDF Generation (pdfkit + fonts + logo)"
Cohesion: 0.17
Nodes (16): authenticate middleware (supabaseAdmin.auth.getClaims, JWKS/ES256), migrate-job paths-filter base/ref pinning incident (migration 039), CI/CD Pipeline (test -> migrate -> deploy-functions), Dev server (tsx watch) stale-reload gotcha, src/app/config/index.ts (Zod-validated env, crash on boot if invalid), graphify knowledge graph workflow, i18n (English/বাংলা via i18next), supabase/migrations/039_rag_chat_knowledge_base.sql (external reference) (+8 more)

### Community 31 - "System Architecture Overview"
Cohesion: 0.14
Nodes (8): globalErrorHandler(), router, app, createImagesApp(), TINY_GIF, router, app, createVariantsApp()

### Community 32 - "CI/CD Two-Environment Model"
Cohesion: 0.12
Nodes (15): addressSchema, CreateOrderInput, createOrderSchema, GetOrdersInput, getOrdersSchema, orderIdSchema, orderNumberSchema, UpdateFulfillmentInput (+7 more)

### Community 33 - "RAG Chat Runtime Flow"
Cohesion: 0.16
Nodes (15): Backend-driven Google/Facebook OAuth (PKCE, state-in-redirect_to), Admin Dashboard feature, Live request-flow architecture diagram (Mermaid.ai), Aurevo.BE repo (Express, TypeScript, Drizzle ORM, Zod, Vitest), Aurevo.UI repo (React 19, Vite, TanStack Query, Tailwind v4, Radix UI), Auth & Profiles (backend-driven, saved address book), Database Scripts (pnpm db:* via supabase CLI), Railway Deployment (Wait for CI, no RAILWAY_TOKEN/railway up) (+7 more)

### Community 34 - "Railway Deployment Config"
Cohesion: 0.18
Nodes (15): /api/chat (SSE stream), /api/orders (transactional), /api/products (read + admin write), Chat service (Claude tool-use loop, true token streaming), Chat widget (Storefront, SSE stream), Chunk + Embed (Voyage AI), conversations + messages (multi-turn history / conversations table), get_my_orders tool (auth-gated only, scoped to req.user.id) (+7 more)

### Community 35 - "DB Sync Script (prod dump/restore)"
Cohesion: 0.20
Nodes (13): oauthCallback(), oauthSession(), oauthUrl(), ALLOWED_PROVIDERS, ExchangeEntry, exchangeStore, getOAuthUrl(), handleOAuthCallback() (+5 more)

### Community 36 - "Graphify Export Options Doc"
Cohesion: 0.32
Nodes (8): createResolverCache(), resolveOrCreate(), resolveOrCreateBrand(), resolveOrCreateCategory(), brands, categories, products, slugify()

### Community 37 - "package.json Metadata"
Cohesion: 0.20
Nodes (12): AI Chat / RAG (chat + knowledge modules), chat_metrics monitoring (migration 044, /admin/ai-metrics), chat.service.ts (streamChat, tool-use loop), Conversation Retention (90d users / 48h guests, cleanup cron), docs/09-ai-chatbot-rag.md (external reference), Eval Harnesses (pnpm eval:retrieval, pnpm eval:answers), History Management (sliding window + rolling intent_summary), hybrid+rerank retrieval default (pgvector + FTS via RRF, Voyage rerank-2.5-lite, eval-gated) (+4 more)

### Community 38 - "Go-Live Decisions Log"
Cohesion: 0.26
Nodes (11): RetrieveMode, CaseResult, GOLDEN_PATH, GoldenCase, GoldenRelevant, main(), MODES, parseArgs() (+3 more)

### Community 39 - "Catalog Restore Build Script"
Cohesion: 0.31
Nodes (7): authenticate(), optionalAuth(), requireAdmin(), verifyToken(), validate(), zodFieldErrors(), router

### Community 40 - "Inventory Test Suite"
Cohesion: 0.20
Nodes (10): Chat service (Claude, tool-use loop, true token streaming), Chat widget (storefront, SSE stream), Chunk + embed (Voyage AI), conversations + messages (multi-turn history), get_my_orders (auth-gated only, scoped to req.user.id), get_product_details (live DB lookup, current stock & price), kb_chunks (pgvector store, products + policies), Policy & FAQ docs (Markdown, new content) (+2 more)

### Community 41 - "Modular Monolith + BFF Pattern"
Cohesion: 0.20
Nodes (9): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, startCommand (+1 more)

### Community 42 - "AI Chat / RAG Module Overview"
Cohesion: 0.22
Nodes (6): DUMP_DEFAULT, ENV_LOCAL, restoreLocalData(), ROOT, run(), WIPE_SCRIPT

### Community 43 - "RAG Backlog & Known Limitations"
Cohesion: 0.20
Nodes (8): authLimiter, baseOptions, cartLimiter, chatLimiter, publicLimiter, strictLimiter, trackingLimiter, uploadLimiter

### Community 44 - "Chat Request Lifecycle & Product Card Matching"
Cohesion: 0.20
Nodes (5): router, app, cartItems, guestSessions, MOCK_USER

### Community 45 - "FAQ Policy Doc"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 46 - "Returns & Exchanges Policy Doc"
Cohesion: 0.31
Nodes (9): Hook-free bulk insert (insertProduct skips per-product embed hook), knowledge.service.ts, src/lib/voyage.ts (Voyage AI embeddings), batchUpsertProductChunks (knowledge.service.ts, batched Voyage embed), Two-layer failure semantics (BullMQ job retries + per-row retry), Import Worker (imports.worker-logic.ts, src/workers/import.worker.ts, pnpm worker), insertProduct (products.service.ts, hook-free raw-insert core), Slug collision under row concurrency (unique constraint + retry self-heal) (+1 more)

### Community 47 - "Variants Test Suite"
Cohesion: 0.33
Nodes (5): createQueueConnection(), ImportJobPayload, importQueue, throttledErrorLogger(), importWorker

### Community 48 - "Shared Helper Utilities"
Cohesion: 0.31
Nodes (8): embed(), embedDocuments(), embedQuery(), RerankResult, sleep(), VoyageEmbeddingsResponse, VoyageInputType, VoyageRerankResponse

### Community 49 - "Courier Tracking Implementation"
Cohesion: 0.25
Nodes (8): @anthropic-ai/sdk, multer, dependencies, @anthropic-ai/sdk, express, multer, pino-http, pino-http

### Community 50 - "Backend-Driven Auth/OAuth Design"
Cohesion: 0.25
Nodes (8): Auto-embed on product create/update/delete (fire-and-forget, not CDC), /api/health deep check + fail-fast boot + graceful shutdown, src/lib/invoice-pdf.ts (pdfkit, never persisted, Noto Sans Bengali), src/lib/logger.ts (pino, replaced morgan), Observability Strategy (pino, Sentry, health check, graceful shutdown), src/lib/email.ts (Resend, fire-and-forget, no-op-if-unconfigured), src/lib/sentry.ts (no-op unless SENTRY_DSN set), Order Invoice PDF feature

### Community 51 - "Tech Stack Decisions"
Cohesion: 0.25
Nodes (6): content, fs, outPath, path, srcPath, tables

### Community 52 - "Graphify Query/Path/Explain Doc"
Cohesion: 0.43
Nodes (5): chat(), chatHealth(), router, ChatMessageInput, chatMessageSchema

### Community 53 - "Payment Methods Policy Doc"
Cohesion: 0.29
Nodes (3): getClient(), maybeRefreshIntentSummary(), messages

### Community 54 - "Shipping Policy Doc"
Cohesion: 0.25
Nodes (3): router, app, inventoryMovements

### Community 55 - "Sizing Guide Policy Doc"
Cohesion: 0.29
Nodes (7): Aurevo.BE (Express + TypeScript + Drizzle), Aurevo.UI (React 19 + Vite storefront/admin), Supabase (Postgres 15 + Auth + Storage), System Diagram, API Response Shape, Build Order & Rationale, Module Build Order

### Community 56 - "Project Keywords"
Cohesion: 0.29
Nodes (6): Can I change or cancel my order after placing it?, Do I need an account to order?, Do you have a physical store?, Frequently Asked Questions, How do I track my order?, What if an item I want is out of stock?

### Community 57 - "Rate Limiter Design Decisions"
Cohesion: 0.29
Nodes (6): Exchanges, How to start a return, Non-returnable items, Refunds, Return window, Returns & Exchanges

### Community 58 - "Retrieval/Answer Eval Harnesses"
Cohesion: 0.29
Nodes (7): Other Tables (kb_chunks, conversations, messages, etc.), Row-Level Security Patterns, Migration 039 CI paths-filter Incident, RAG Data Model (kb_chunks/conversations/messages), Ingestion Pipeline (knowledge.service.ts), Production Ingestion Runbook, Rollout Checklist

### Community 60 - "CI Migration paths-filter Incident"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (6): Courier Tracking (Steadfast) module, restoreOrderStock shared helper, Atomic Stock Accounting (single guarded UPDATE, no reserve-then-decrement), Courier Tracking (Steadfast) feature, docs/05-implementation.md (external reference), Order Management (atomic stock decrement, lifecycle, sequential order numbers)

### Community 62 - "Community 62"
Cohesion: 0.33
Nodes (5): Cash on delivery, Online payment, Order confirmation, Payment Methods, Payment security

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (5): Delivery areas, Delivery time, Order tracking, Shipping, Shipping cost

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (5): Between sizes, Exchanging for a different size, Finding the right fit, How sizes are shown, Sizing Guide

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (5): Backend-driven Auth via supabaseAdmin.auth.getClaims, No Supabase SDK on Frontend, Auth Design (JWKS getClaims), JWT Verification Middleware (getClaims), Auth Middleware (authenticate/optionalAuth/requireAdmin)

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (5): Lazy Anthropic Client Initialization, Chat Request Lifecycle, Frontend Chat Widget (ai-chat-widget.tsx), Chat Guardrails (auth-gated get_my_orders), Product Card Matching (three-tier)

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (5): Backend: Modular Monolith (Express + TypeScript), RAG Chatbot Architecture Diagram (draft/duplicate of docs/images/rag-chatbot-architecture.svg, the canonical diagram referenced from docs/09-ai-chatbot-rag.md), Ingestion pipeline (offline, re-run after catalog changes), Runtime chat flow (every customer message), Supabase / PostgreSQL 15

### Community 68 - "Community 68"
Cohesion: 0.50
Nodes (5): CI Deploy Edge Functions Job (Stage 3), CI Migrate Job (Stage 2), Migration 039 silently skipped twice (dorny/paths-filter race with merge-back.yml), paths-filter base/ref pinning to event SHAs, CI Test Job (Stage 1)

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (4): Data Layer (PostgreSQL via Supabase), Drizzle ORM (introspect-first) Choice, Database Schema Overview, Drizzle Schema (23 tables, 11 enums)

### Community 70 - "Community 70"
Cohesion: 0.50
Nodes (4): Tiered Rate Limiters, Environment Variable Security Table, Rate-Limiter Bypass Token, Rate Limiter Reference (skills)

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 76 - "Community 76"
Cohesion: 0.83
Nodes (3): ingestPolicyDocs(), ingestProducts(), main()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (3): Two-Environment CI/CD Model, CI/CD Pipeline (test/migrate/deploy-functions), merge-back.yml Workflow

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (3): Testing Strategy Overview, Vitest + Supertest, Real DB over Mocks, Real DB, No Mocks on Data Layer Philosophy

### Community 81 - "Community 81"
Cohesion: 0.67
Nodes (3): inventory Table (generated available_quantity), Inventory Endpoints, Server-Side XLSX Export

## Knowledge Gaps
- **578 isolated node(s):** `$schema`, `builder`, `startCommand`, `healthcheckPath`, `healthcheckTimeout` (+573 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **194 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Auth Controller (login/OAuth/addresses)` to `Bulk Import Module (routes/controller/schema)`, `App Bootstrap (Express app + config + Swagger)`, `Knowledge Service (RAG embedding/retrieval)`, `Rate Limiters`, `Admin Module + Shared API Types`, `Auth Middleware + Variants Admin Routes`, `Courier Service (Steadfast tracking)`, `Dev Dependencies`, `Auth/Brands Test Suites`, `Inventory Controller`, `Admin Service + Courier Tests`, `Graphify Skill Doc (top-level)`, `Drizzle Relations`, `Supabase Edge Function (meta-conversions)`, `Brands/Categories Service`, `System Architecture Overview`, `DB Sync Script (prod dump/restore)`, `Catalog Restore Build Script`, `Courier Tracking Implementation`, `Graphify Query/Path/Explain Doc`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `keywords` connect `Admin Module + Shared API Types` to `Auth Controller (login/OAuth/addresses)`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `$schema`, `builder`, `startCommand` to the rest of the system?**
  _629 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bulk Import Module (routes/controller/schema)` be split into smaller, more focused modules?**
  _Cohesion score 0.06126331811263318 - nodes in this community are weakly interconnected._
- **Should `Auth Controller (login/OAuth/addresses)` be split into smaller, more focused modules?**
  _Cohesion score 0.0505175983436853 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap (Express app + config + Swagger)` be split into smaller, more focused modules?**
  _Cohesion score 0.06428571428571428 - nodes in this community are weakly interconnected._
- **Should `Knowledge Service (RAG embedding/retrieval)` be split into smaller, more focused modules?**
  _Cohesion score 0.062409288824383166 - nodes in this community are weakly interconnected._