import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local first (Next.js convention, takes precedence), then .env
// as a fallback. drizzle-kit doesn't load these on its own.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
