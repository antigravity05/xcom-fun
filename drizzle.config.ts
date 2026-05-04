import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local first (Next.js convention, takes precedence), then .env.
// drizzle-kit doesn't load these on its own.
config({ path: ".env.local" });
config({ path: ".env" });

const runtimeUrl = process.env.DATABASE_URL;
if (!runtimeUrl) {
  throw new Error("DATABASE_URL is not set — required for drizzle-kit");
}

// Neon's pooler endpoint (PgBouncer transaction mode) doesn't support the
// prepared statements drizzle-kit uses for schema introspection. The runtime
// pool is fine; for drizzle-kit operations we hit the direct endpoint by
// stripping the "-pooler" segment from the host.
const migrationUrl = runtimeUrl.replace(/-pooler\./, ".");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
