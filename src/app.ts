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
app.use(
  cors({
    origin: [
      config.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Guest-Session"],
  })
);

// Request logging
app.use(morgan(config.NODE_ENV === "development" ? "dev" : "combined"));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== Health Check ====================

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: { status: "ok", timestamp: new Date().toISOString(), environment: config.NODE_ENV },
  });
});

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
