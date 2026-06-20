import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./index";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Aurevo Fashion API",
      version: "1.0.0",
      description: "E-commerce API for Aurevo Fashion Store",
      contact: {
        name: "Aurevo Support",
        email: "support@aurevofashion.store",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: "Development server",
      },
      {
        url: "https://api.aurevofashion.store",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
        guestSession: {
          type: "apiKey",
          in: "header",
          name: "X-Guest-Session",
          description: "Guest session ID for unauthenticated users",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 10 },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            phone: { type: "string" },
            role: { type: "string", enum: ["USER", "ADMIN"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            name: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Products", description: "Product management" },
      { name: "Categories", description: "Category management" },
      { name: "Brands", description: "Brand management" },
      { name: "Cart", description: "Shopping cart operations" },
      { name: "Orders", description: "Order management" },
    ],
  },
  apis: ["./src/app.ts", "./src/app/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);



