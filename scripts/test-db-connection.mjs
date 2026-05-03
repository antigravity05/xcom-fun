import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DATABASE_URL is not set in .env.local");
  process.exit(1);
}

console.log("Trying", url.replace(/:\/\/[^@]+@/, "://[redacted]@"));

const sql = postgres(url, { prepare: false, connect_timeout: 10 });

try {
  const rows = await sql`SELECT 1 AS ok, current_database() AS db, version() AS version`;
  console.log("Connected.", rows[0]);
  process.exit(0);
} catch (e) {
  console.error("FAIL:", e.code || "", e.message);
  process.exit(1);
}
