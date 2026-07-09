import express, { Application } from "express";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import { sql } from "drizzle-orm";
import swaggerUi from "swagger-ui-express";
import { config } from "./app/config";
import { swaggerSpec } from "./app/config/swagger";
import { globalErrorHandler } from "./app/middlewares";
import { db } from "./db";
import { logger } from "./lib/logger";
import router from "./routes";

const app: Application = express();

// Trust Railway's reverse proxy so X-Forwarded-For is used for real IPs
app.set("trust proxy", 1);

// ==================== Middleware ====================

// Security middleware (disable crossOriginResourcePolicy so CORS headers reach the browser)
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — must come before all routes and rate limiters
const allowedOrigins = Array.from(
  new Set([
    "http://localhost:5173",
    "http://localhost:3000",
    "https://aurevofashion.store",
    ...(config.FRONTEND_URL
      ? config.FRONTEND_URL.split(",").map((s) => s.trim())
      : []),
  ]),
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Guest-Session",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Structured request logging (JSON in prod, pretty in dev via the shared logger)
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/api/health" },
  }),
);

// Response compression
app.use(compression());

// Body parsing — explicit limits so oversized payloads are rejected early
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ==================== Health Check ====================

// Deep health check: pings the database so deploy platforms (Railway) can
// gate rollouts on a genuinely usable instance, not just a bound port.
const healthHandler = async (
  _req: import("express").Request,
  res: import("express").Response,
) => {
  let dbStatus: "ok" | "down" = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "down";
  }

  res.status(dbStatus === "ok" ? 200 : 503).json({
    success: dbStatus === "ok",
    data: {
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
    },
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// ==================== API Documentation ====================

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Aurevo Fashion API Docs",
  }),
);

// Serve raw OpenAPI spec
app.get("/api/docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ==================== API Routes ====================

app.use("/api", router);

// ==================== 404 Handler ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ==================== Error Handler ====================

app.use(globalErrorHandler);

export default app;
