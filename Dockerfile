FROM node:22-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
# The app reads these at runtime relative to process.cwd(), not via require()
# or an import, so tsc never bundles them into dist/ and the production stage
# must copy them explicitly — assets/ (invoice logo + Bengali fonts) and
# content/ (RAG policy docs ingested by knowledge.service.ts) both need this.
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/content ./content

EXPOSE 5000

CMD ["node", "dist/server.js"]
