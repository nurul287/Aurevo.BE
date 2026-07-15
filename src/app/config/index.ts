import dotenv from "dotenv";
import { z } from "zod";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

  // Server
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  BACKEND_URL: z.string().url().default("http://localhost:5000"),

  // Anthropic AI
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5-20251001"),

  // Voyage AI embeddings — powers the RAG chatbot's knowledge base
  VOYAGE_API_KEY: z.string().min(1),
  VOYAGE_EMBEDDING_MODEL: z.string().default("voyage-3"),

  // Shared secret for internal, non-user machine-to-machine routes
  // (e.g. the chat-history cleanup cron) — no JWT/session auth applies to these.
  INTERNAL_TASK_TOKEN: z.string().min(1),

  // Error tracking — optional; Sentry is a no-op when unset
  SENTRY_DSN: z.string().url().optional(),

  // Email (Resend) — optional; no-op when unset
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().default("Aurevo Fashion <orders@aurevofashion.store>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export default config;
