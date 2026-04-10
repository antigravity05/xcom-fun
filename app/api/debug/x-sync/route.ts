import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/database/client";
import { postPublications } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Diagnostic endpoint for X/Twitter sync debugging.
 *
 * GET /api/debug/x-sync                              → show accounts + publications
 * GET /api/debug/x-sync?action=test-post             → post a test tweet and log full response
 * GET /api/debug/x-sync?action=like&tweetId=xxx      → test like with raw tweet ID
 * GET /api/debug/x-sync?action=retweet&tweetId=xxx   → test retweet with raw tweet ID
 * GET /api/debug/x-sync?action=reply&tweetId=xxx     → test reply with raw tweet ID
 * GET /api/debug/x-sync?action=fix-publications      → fetch recent tweets and backfill externalPostId
 *
 * DELETE THIS FILE before going to production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const tweetId = searchParams.get("tweetId");

  try {
    const db = getDb();
    const ZERNIO_API_BASE = "https://zernio.com/api/v1";
    const apiKey = process.env.ZERNIO_API_KEY!;

    // Always show tokens + publications for context
    const xAccounts = await db.query.xAccounts.findMany();
    const tokenSummary = xAccounts.map((account) => ({
      userId: account.userId,
      hasAccessToken: Boolean(account.accessTokenCiphertext),
      accessTokenPreview: account.accessTokenCiphertext
        ? String(account.accessTokenCiphertext).slice(0, 20) + "..."
        : null,
    }));

    const pubs = await db.query.postPublications.findMany();
    const pubSummary = pubs.map((pub) => ({
      postId: pub.postId,
      provider: pub.provider,
      status: pub.status,
      externalPostId: pub.externalPostId,
      lastError: pub.lastError,
    }));

    const baseInfo = {
      tokenAccounts: tokenSummary,
      publications: pubSummary,
      zernioApiKey: apiKey ? "SET (" + apiKey.slice(0, 10) + "...)" : "NOT SET",
      zernioProfileId: process.env.ZERNIO_PROFILE_ID ?? "NOT SET",
    };

    // Get current user's Zernio accountId
    const cookieStore = await cookies();
    const viewerUserId = cookieStore.get("xcom_demo_user_id")?.value;
    const xAccount = viewerUserId ? xAccounts.find((a) => a.userId === viewerUserId) : null;
    const accountId = xAccount ? String(xAccount.accessTokenCiphertext) : null;

    if (!action) {
      return NextResponse.json({
        ...baseInfo,
        viewerUserId,
        accountId,
        usage: {
          "test-post": "/api/debug/x-sync?action=test-post — post a test tweet and show full Zernio response",
          "like": "/api/debug/x-sync?action=like&tweetId=TWITTER_TWEET_ID",
          "retweet": "/api/debug/x-sync?action=retweet&tweetId=TWITTER_TWEET_ID",
          "reply": "/api/debug/x-sync?action=reply&tweetId=TWITTER_TWEET_ID",
          "fix-publications": "/api/debug/x-sync?action=fix-publications — fetch recent tweets and backfill missing externalPostIds",
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (!viewerUserId || !accountId) {
      return NextResponse.json({ ...baseInfo, error: "No session or no X account linked. Log in first." }, { status: 401 });
    }

    const testResult: Record<string, unknown> = { action, accountId };

    // ── Test post: publish a real tweet and show the FULL Zernio response ──
    if (action === "test-post") {
      const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `Test from x-com.fun debug [${Date.now()}]`,
          platforms: [{ platform: "twitter", accountId }],
          publishNow: true,
        }),
      });
      const body = await res.text();
      testResult.status = res.status;
      testResult.rawResponse = body;
      try {
        testResult.parsed = JSON.parse(body);
      } catch { /* ok */ }
      return NextResponse.json({ ...baseInfo, test: testResult });
    }

    // ── Fix publications: list Zernio posts, match to local posts, backfill tweetIds ──
    if (action === "fix-publications") {
      const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = await res.text();
      testResult.listPostsStatus = res.status;

      try {
        const data = JSON.parse(body);
        const zernioPosts = data.posts ?? data.data ?? (Array.isArray(data) ? data : []);
        testResult.zernioPostCount = zernioPosts.length;

        // Get all local posts from DB to match by content
        const { posts: postsTable } = await import("@/drizzle/schema");
        const allPosts = await db.query.posts.findMany();

        const updates: Array<{ postId: string; tweetId: string; tweetUrl: string; content: string }> = [];

        for (const zPost of zernioPosts) {
          const twitterPlatform = zPost.platforms?.find((p: any) => p.platform === "twitter");
          const tweetId = twitterPlatform?.platformPostId;
          const tweetUrl = twitterPlatform?.platformPostUrl;
          if (!tweetId) continue;

          const content = zPost.content as string;
          // Match by content to a local post
          const localPost = allPosts.find((lp) => lp.body === content);
          if (!localPost) continue;

          // Check if this post has a publication row without externalPostId
          const pub = pubs.find(
            (p) => p.postId === localPost.id && p.provider === "x" && !p.externalPostId,
          );
          if (!pub) continue;

          // Update the publication row
          await db
            .update(postPublications)
            .set({ externalPostId: tweetId })
            .where(and(eq(postPublications.postId, localPost.id), eq(postPublications.provider, "x")));

          updates.push({ postId: localPost.id, tweetId, tweetUrl, content: content.slice(0, 50) });
        }

        testResult.backfilled = updates;
        testResult.backfilledCount = updates.length;
      } catch (err) {
        testResult.error = err instanceof Error ? err.message : String(err);
        testResult.listPostsRaw = body;
      }

      return NextResponse.json({ ...baseInfo, test: testResult });
    }

    // ── Simulate reply: follows the exact same code path as the app ──
    if (action === "simulate-reply") {
      const postId = searchParams.get("postId");
      if (!postId) {
        return NextResponse.json({
          ...baseInfo,
          error: "simulate-reply requires &postId=LOCAL_POST_ID (from the publications list above)",
        }, { status: 400 });
      }

      const steps: Record<string, unknown> = { postId, viewerUserId };

      // Step 1: getZernioAccountId
      try {
        const { isZernioMode } = await import("@/lib/x/oauth-contract");
        steps.isZernioMode = isZernioMode();
        if (!isZernioMode()) {
          steps.error = "Not in Zernio mode";
          return NextResponse.json({ ...baseInfo, test: steps });
        }
        const { getUserTokens } = await import("@/lib/x/token-store");
        const tokens = await getUserTokens(viewerUserId!);
        steps.hasTokens = Boolean(tokens);
        steps.accountIdFromTokens = tokens?.accessToken ?? "NULL";
      } catch (err) {
        steps.getAccountIdError = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ ...baseInfo, test: steps });
      }

      // Step 2: getExternalTweetId
      try {
        const row = await db.query.postPublications.findFirst({
          where: (table, ops) =>
            ops.and(
              ops.eq(table.postId, postId),
              ops.eq(table.provider, "x"),
              ops.eq(table.status, "published"),
            ),
        });
        steps.publicationRow = row ? {
          postId: row.postId,
          status: row.status,
          externalPostId: row.externalPostId,
        } : "NOT FOUND";
        steps.resolvedTweetId = row?.externalPostId ?? "NULL";
      } catch (err) {
        steps.getExternalTweetIdError = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ ...baseInfo, test: steps });
      }

      // Step 3: actually call replyToTweet if we have everything
      const resolvedTweetId = (steps.resolvedTweetId as string);
      const resolvedAccountId = (steps.accountIdFromTokens as string);
      if (resolvedTweetId && resolvedTweetId !== "NULL" && resolvedAccountId && resolvedAccountId !== "NULL") {
        try {
          const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `App-simulated reply [${Date.now()}]`,
              platforms: [{
                platform: "twitter",
                accountId: resolvedAccountId,
                replyToTweetId: resolvedTweetId,
              }],
              publishNow: true,
            }),
          });
          const body = await res.text();
          steps.replyStatus = res.status;
          steps.replyResponse = body;
          try { steps.replyParsed = JSON.parse(body); } catch { /* ok */ }
        } catch (err) {
          steps.replyError = err instanceof Error ? err.message : String(err);
        }
      } else {
        steps.skipped = "Missing tweetId or accountId — reply would be skipped in app";
      }

      return NextResponse.json({ ...baseInfo, test: steps });
    }

    // ── Like / Retweet / Reply with raw tweetId ──
    if (!tweetId) {
      return NextResponse.json({
        ...baseInfo,
        error: `action=${action} requires &tweetId=TWITTER_TWEET_ID parameter. Use action=test-post first to get a tweet ID, or action=fix-publications to list your tweets.`,
      }, { status: 400 });
    }

    testResult.tweetId = tweetId;

    if (action === "like") {
      const res = await fetch(`${ZERNIO_API_BASE}/twitter/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, tweetId }),
      });
      const body = await res.text();
      testResult.status = res.status;
      testResult.rawResponse = body;
      try { testResult.parsed = JSON.parse(body); } catch { /* ok */ }
    } else if (action === "retweet") {
      // First try native retweet
      const res1 = await fetch(`${ZERNIO_API_BASE}/twitter/retweet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, tweetId }),
      });
      const body1 = await res1.text();
      testResult.nativeRetweet = { status: res1.status, response: body1 };

      // If native fails, try quote tweet fallback
      if (!res1.ok) {
        const res2 = await fetch(`${ZERNIO_API_BASE}/posts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "",
            platforms: [{
              platform: "twitter",
              accountId,
              quoteTweetId: tweetId,
            }],
            publishNow: true,
          }),
        });
        const body2 = await res2.text();
        testResult.quoteTweetFallback = { status: res2.status, response: body2 };
        try { testResult.quoteTweetParsed = JSON.parse(body2); } catch { /* ok */ }
      }
    } else if (action === "reply") {
      const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Test reply from x-com.fun [${Date.now()}]`,
          platforms: [{
            platform: "twitter",
            accountId,
            replyToTweetId: tweetId,
          }],
          publishNow: true,
        }),
      });
      const body = await res.text();
      testResult.status = res.status;
      testResult.rawResponse = body;
      try { testResult.parsed = JSON.parse(body); } catch { /* ok */ }
    }

    return NextResponse.json({ ...baseInfo, test: testResult, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
