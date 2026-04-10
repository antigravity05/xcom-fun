import { NextResponse } from "next/server";

/**
 * Debug endpoint to inspect postPublications and users tables.
 * Hit GET /api/debug/sync to see tweet IDs and user data.
 * DELETE THIS FILE before going to production.
 */
export async function GET() {
  try {
    const { getDb } = await import("@/lib/database/client");
    const db = getDb();

    // 1. Get all postPublications rows
    const publications = await db.query.postPublications.findMany({
      orderBy: (table, { desc }) => [desc(table.lastAttemptAt)],
      limit: 50,
    });

    // 2. Get all users with their X info
    const { readXcomStore } = await import("@/lib/xcom-persistence");
    const snapshot = await readXcomStore();
    const users = snapshot.users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      xHandle: u.xHandle,
      xUserId: u.xUserId,
    }));

    // 3. Get recent posts with their IDs
    const recentPosts = snapshot.posts.slice(-20).map((p) => ({
      id: p.id,
      communityId: p.communityId,
      authorUserId: p.authorUserId,
      body: p.body?.slice(0, 80),
      parentPostId: p.parentPostId ?? null,
      createdAt: p.createdAt,
    }));

    // 4. Check token store
    const { getUserTokens } = await import("@/lib/x/token-store");
    const tokenInfo: Record<string, unknown> = {};
    for (const user of users) {
      try {
        const tokens = await getUserTokens(user.id);
        tokenInfo[user.id] = tokens
          ? {
              hasAccessToken: Boolean(tokens.accessToken),
              accessTokenPrefix: tokens.accessToken?.slice(0, 20) + "...",
              hasRefreshToken: Boolean(tokens.refreshToken),
              expiresAt: tokens.expiresAt,
            }
          : null;
      } catch (e) {
        tokenInfo[user.id] = { error: String(e) };
      }
    }

    // 5. Check current mode
    const { isZernioMode } = await import("@/lib/x/oauth-contract");

    return NextResponse.json(
      {
        mode: isZernioMode() ? "zernio" : "direct-x-api",
        users,
        tokenInfo,
        publications: publications.map((p) => ({
          postId: p.postId,
          provider: p.provider,
          status: p.status,
          externalPostId: p.externalPostId,
          lastError: p.lastError,
          attemptCount: p.attemptCount,
          lastAttemptAt: p.lastAttemptAt,
        })),
        recentPosts,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
