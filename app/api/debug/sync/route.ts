import { NextResponse } from "next/server";

/**
 * Debug endpoint to inspect postPublications and user data.
 * Hit GET /api/debug/sync to see tweet IDs and user data.
 * DELETE THIS FILE before going to production.
 */
export async function GET() {
  try {
    const { getDb } = await import("@/lib/database/client");
    const { sql } = await import("drizzle-orm");
    const db = getDb();

    // 1. Raw SQL query for postPublications — most reliable
    const pubRows = await db.execute(
      sql`SELECT post_id, provider, status, external_post_id, last_error, attempt_count, last_attempt_at
          FROM post_publications
          ORDER BY last_attempt_at DESC NULLS LAST
          LIMIT 30`
    );

    // 2. Get users
    const userRows = await db.execute(
      sql`SELECT id, display_name, x_handle, x_user_id FROM users LIMIT 20`
    );

    // 3. Get recent posts
    const postRows = await db.execute(
      sql`SELECT id, community_id, author_user_id, LEFT(body, 80) as body_preview, parent_post_id, created_at
          FROM posts
          ORDER BY created_at DESC
          LIMIT 30`
    );

    // 4. Check x_accounts tokens
    const tokenRows = await db.execute(
      sql`SELECT user_id, LEFT(access_token, 20) as token_prefix,
          CASE WHEN refresh_token IS NOT NULL THEN 'yes' ELSE 'no' END as has_refresh,
          expires_at
          FROM x_accounts LIMIT 10`
    );

    // 5. Check mode
    const isZernio = Boolean(process.env.ZERNIO_API_KEY);

    return NextResponse.json({
      mode: isZernio ? "zernio" : "direct-x-api",
      publications: pubRows.rows ?? pubRows,
      users: userRows.rows ?? userRows,
      recentPosts: postRows.rows ?? postRows,
      tokens: tokenRows.rows ?? tokenRows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    );
  }
}
