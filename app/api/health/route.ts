import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    status: "ok",
  };

  // Test database connection
  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/lib/database/client");
      const db = getDb();
      await db.execute(
        // @ts-expect-error raw SQL
        { sql: "SELECT 1" }
      );
      checks.database = "connected";
    } catch {
      checks.database = "error";
      checks.status = "degraded";
    }
  } else {
    checks.database = "not configured";
  }

  return NextResponse.json(checks, {
    status: checks.status === "ok" ? 200 : 500,
  });
}
