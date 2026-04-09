import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.slice(0, 20) + "...)" : "NOT SET",
      VERCEL: process.env.VERCEL ?? "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  // Test database connection
  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/lib/database/client");
      const db = getDb();
      const result = await db.execute(
        // @ts-expect-error raw SQL
        { sql: "SELECT count(*) as cnt FROM users" }
      );
      checks.database = { status: "connected", userCount: result };
    } catch (err) {
      checks.database = {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
      };
    }
  } else {
    checks.database = { status: "skipped", reason: "no DATABASE_URL" };
  }

  // Test readXcomStore
  try {
    const { readXcomStore } = await import("@/lib/xcom-persistence");
    const snapshot = await readXcomStore();
    checks.store = {
      status: "ok",
      users: snapshot.users.length,
      communities: snapshot.communities.length,
      posts: snapshot.posts.length,
    };
  } catch (err) {
    checks.store = {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
    };
  }

  const allOk = checks.store && (checks.store as any).status === "ok";

  return NextResponse.json(checks, { status: allOk ? 200 : 500 });
}
