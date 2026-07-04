import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { config } from "./app/config";
import { globalErrorHandler } from "./app/middlewares";
import { swaggerSpec } from "./app/config/swagger";
import router from "./routes";

const app: Application = express();

// ==================== Middleware ====================

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = Array.from(
  new Set([
    "http://localhost:5173",
    "http://localhost:3000",
    ...config.FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean),
  ])
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Guest-Session"],
    exposedHeaders: ["Content-Disposition"],
  })
);

// Request logging
app.use(morgan(config.NODE_ENV === "development" ? "dev" : "combined"));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== Health Check ====================

const healthHandler = (_req: import("express").Request, res: import("express").Response) => {
  res.json({
    success: true,
    data: { status: "ok", timestamp: new Date().toISOString(), environment: config.NODE_ENV },
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
  })
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
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  });
});

// ==================== Error Handler ====================

app.use(globalErrorHandler);

export default app;
