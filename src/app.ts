import express, { Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { config } from "./app/config";
import { swaggerSpec } from "./app/config/swagger";
import { globalErrorHandler } from "./app/middlewares";
import router from "./routes";

const app: Application = express();

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

// Request logging
app.use(morgan(config.NODE_ENV === "development" ? "dev" : "combined"));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== Health Check ====================

const healthHandler = (
  _req: import("express").Request,
  res: import("express").Response,
) => {
  res.json({
    success: true,
    data: {
      status: "ok",
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
