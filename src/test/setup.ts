import dotenv from "dotenv";
import path from "path";

// Load .env.local before anything else — must run before any module imports config
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();
