import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, connect_timeout: 10 });

const statements = [
  // Make author_user_id nullable so ghost imports (X authors with no
  // x-com.fun account) can be stored.
  `ALTER TABLE "posts" ALTER COLUMN "author_user_id" DROP NOT NULL`,

  // Add external snapshot columns to "posts" (NULL for native posts).
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_tweet_id" text`,
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_author_handle" text`,
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_author_display_name" text`,
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_author_avatar_url" text`,
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_engagement_likes" integer`,
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_engagement_reposts" integer`,
  `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "external_posted_at" timestamp with time zone`,

  // Indexes for dedup + fast lazy-link lookup.
  `CREATE UNIQUE INDEX IF NOT EXISTS "posts_external_tweet_unique"
   ON "posts" ("community_id", "external_tweet_id")`,
  `CREATE INDEX IF NOT EXISTS "posts_external_author_handle_idx"
   ON "posts" ("external_author_handle")`,

  // Import tokens table — short-lived bearer tokens issued by /api/import/start
  // and consumed by the extension when POSTing batches.
  `CREATE TABLE IF NOT EXISTS "import_tokens" (
    "token" text PRIMARY KEY NOT NULL,
    "community_id" uuid NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "import_tokens_community_idx"
   ON "import_tokens" ("community_id")`,
  `CREATE INDEX IF NOT EXISTS "import_tokens_user_idx"
   ON "import_tokens" ("user_id")`,
];

let applied = 0;
let skipped = 0;

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
  try {
    await sql.unsafe(stmt);
    console.log(`✓ ${preview}…`);
    applied += 1;
  } catch (e) {
    // ALTER COLUMN ... DROP NOT NULL is idempotent silently in Postgres,
    // but ADD CONSTRAINT or DROP NOT NULL on already-applied state can
    // surface specific errors. Surface them but keep going.
    if (e.code === "42701" /* duplicate column */ || e.code === "42P07" /* duplicate table */) {
      console.log(`• skipped (already applied): ${preview}…`);
      skipped += 1;
    } else {
      console.error(`✗ FAIL: ${preview}…\n   ${e.code || ""} ${e.message}`);
      await sql.end();
      process.exit(1);
    }
  }
}

console.log(`\nDone. ${applied} applied, ${skipped} skipped.`);
await sql.end();
