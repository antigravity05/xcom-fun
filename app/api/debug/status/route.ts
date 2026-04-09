import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint: GET /api/debug/status
 * Shows current user session, DB connectivity, and table status.
 * DELETE THIS FILE before going to production.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check session cookie
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("xcom_demo_user_id")?.value;
    results.sessionUserId = userId ?? "(no session)";
  } catch (err) {
    results.sessionError = String(err);
  }

  // 2. Check DB connectivity and tables
  if (process.env.DATABASE_URL) {
    results.hasDatabase = true;
    try {
      const { getDb } = await import("@/lib/database/client");
      const db = getDb();

      // Test each table
      const tables = [
        "users",
        "communities",
        "communityMemberships",
        "posts",
        "postReplies",
        "postReactions",
        "postPublications",
        "xAccounts",
      ];

      for (const table of tables) {
        try {
          const rows = await (db.query as any)[table].findMany({ limit: 1 });
          results[`table_${table}`] = `OK (${Array.isArray(rows) ? rows.length : "?"} sample rows)`;
        } catch (err) {
          results[`table_${table}`] = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      // 3. Check current user in DB
      const cookieStore = await cookies();
      const userId = cookieStore.get("xcom_demo_user_id")?.value;
      if (userId) {
        const user = await db.query.users.findFirst({
          where: (u: any, { eq }: any) => eq(u.id, userId),
        });
        results.currentUser = user ?? "NOT FOUND IN DB";

        // Check memberships
        const memberships = await db.query.communityMemberships.findMany({
          where: (m: any, { eq }: any) => eq(m.userId, userId),
        });
        results.userMemberships = memberships.length > 0
          ? memberships.map((m: any) => ({
              communityId: m.communityId,
              role: m.role,
              status: m.status,
            }))
          : "NO MEMBERSHIPS (user needs to join a community first)";

        // Check tokens
        const xAccount = await db.query.xAccounts.findFirst({
          where: (x: any, { eq }: any) => eq(x.userId, userId),
        });
        results.userXAccount = xAccount
          ? {
              hasAccessToken: Boolean(xAccount.accessTokenCiphertext),
              hasRefreshToken: Boolean(xAccount.refreshTokenCiphertext),
              expiresAt: xAccount.expiresAt?.toISOString(),
            }
          : "NO X ACCOUNT LINKED";
      }
    } catch (err) {
      results.dbError = err instanceof Error ? err.message : String(err);
    }
  } else {
    results.hasDatabase = false;
    results.dbWarning = "DATABASE_URL not set";
  }

  // 4. Check env vars
  results.env = {
    hasZernioApiKey: Boolean(process.env.ZERNIO_API_KEY),
    hasZernioProfileId: Boolean(process.env.ZERNIO_PROFILE_ID),
    zernioProfileIdValue: process.env.ZERNIO_PROFILE_ID ?? "(not set)",
    hasTokenEncryptionKey: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "(not set)",
    isVercel: Boolean(process.env.VERCEL),
  };

  return NextResponse.json(results, { status: 200 });
}
