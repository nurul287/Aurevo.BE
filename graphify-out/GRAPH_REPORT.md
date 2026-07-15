# Graph Report - .  (2026-07-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 777 nodes · 1631 edges · 34 communities (31 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dfdb7825`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 27
- Community 28
- Community 30

## God Nodes (most connected - your core abstractions)
1. `express` - 36 edges
2. `scripts` - 29 edges
3. `db` - 24 edges
4. `products` - 20 edges
5. `compilerOptions` - 17 edges
6. `productVariants` - 15 edges
7. `authenticate()` - 14 edges
8. `validate()` - 14 edges
9. `AppError` - 13 edges
10. `NotFoundError` - 12 edges

## Surprising Connections (you probably didn't know these)
- `buildXlsxBuffer()` --references--> `xlsx`  [EXTRACTED]
  src/lib/xlsx-export.ts → package.json
- `createImagesApp()` --indirect_call--> `globalErrorHandler()`  [INFERRED]
  src/app/modules/images/images.test.ts → src/app/middlewares/globalErrorHandler.ts
- `createVariantsApp()` --indirect_call--> `globalErrorHandler()`  [INFERRED]
  src/app/modules/variants/variants.test.ts → src/app/middlewares/globalErrorHandler.ts
- `createTestApp()` --indirect_call--> `globalErrorHandler()`  [INFERRED]
  src/test/app.ts → src/app/middlewares/globalErrorHandler.ts
- `globalErrorHandler()` --calls--> `zodFieldErrors()`  [EXTRACTED]
  src/app/middlewares/globalErrorHandler.ts → src/app/middlewares/validateRequest.ts

## Import Cycles
- None detected.

## Communities (34 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (53): express, ApiResponse, Express, PaginatedResponse, PaginationParams, Request, authenticate(), optionalAuth() (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (39): AppError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, deleteAvatar() (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (41): createAddress(), deleteAddress(), deleteAvatar(), forgotPassword(), getAddresses(), getMe(), login(), logout() (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (45): getVariantAvailability(), cancelOrder(), claimOrders(), createOrder(), deleteOrder(), getOrderById(), getOrderByNumber(), getOrders() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (43): author, description, engines, node, keywords, license, main, name (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (40): @anthropic-ai/sdk, bcryptjs, compression, dotenv, drizzle-orm, express-rate-limit, helmet, jsonwebtoken (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (25): adjustInventory(), exportInventory(), getInventory(), getInventoryById(), getLowStockAlerts(), getMovements(), getVariantAvailability(), upsertInventory() (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (35): drizzle-kit, devDependencies, drizzle-kit, pino-pretty, supertest, tsx, @types/bcryptjs, @types/compression (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (25): bulkDelete(), bulkUpdateStatus(), createProduct(), deleteProduct(), getFeaturedProducts(), getProductById(), getProductBySlug(), getProducts() (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (33): addressesRelations, brandsRelations, cartItemsRelations, categoriesRelations, inventoryMovementsRelations, inventoryRelations, metaCapiSentRelations, orderItemsRelations (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (29): adjustStock(), bulkCreateVariants(), createVariant(), deleteVariant(), getVariantById(), getVariants(), updateVariant(), AdjustStockInput (+21 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (27): addItem(), clearCart(), createGuestSession(), getCart(), migrateCart(), removeItem(), resolveOwner(), updateItem() (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (23): allowedOrigins, app, envSchema, parsed, options, swaggerSpec, oauthCallback(), oauthSession() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (22): authLimiter, baseOptions, cartLimiter, chatLimiter, strictLimiter, uploadLimiter, createCategory(), deleteCategory() (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (24): dist, ES2022, node_modules, src/*, compilerOptions, baseUrl, declaration, declarationMap (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (15): router, app, getClient(), handleToolCall(), streamChat(), TOOLS, router, app (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (22): AdminClient, corsHeaders, createAdminClient(), DbWebhookPayload, getEnv(), handlePurchase(), jsonResponse(), loadOrderContext() (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): app, TEST_ADDRESS, app, TEST_ADDRESS, productReviews, profiles, cleanTestUsers(), ensureAuthUser() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (8): getDashboard(), getAdminDashboard(), app, inventory, orderItems, orders, products, productVariants

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (7): globalErrorHandler(), router, app, createImagesApp(), TINY_GIF, createVariantsApp(), productImages

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (9): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, startCommand (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (6): DUMP_DEFAULT, ENV_LOCAL, restoreLocalData(), ROOT, run(), WIPE_SCRIPT

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (6): router, app, router, app, createTestApp(), cleanBrands()

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (4): router, app, cartItems, guestSessions

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (6): content, fs, outPath, path, srcPath, tables

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (3): router, app, inventoryMovements

## Knowledge Gaps
- **189 isolated node(s):** `name`, `version`, `description`, `main`, `node` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 18`, `Community 19`, `Community 22`?**
  _High betweenness centrality (0.314) - this node is a cross-community bridge._
- **Why does `keywords` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 5` to `Community 4`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.060041407867494824 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08020050125313283 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07402031930333818 - nodes in this community are weakly interconnected._