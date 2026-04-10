import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/database/client";

/**
 * Diagnostic endpoint: GET /api/debug/x-sync?action=retweet|reply|like&postId=xxx
 *
 * Without params: shows token accounts, publications, and env check.
 * With action + postId: actually tests the Zernio call and shows the result.
 *
 * DELETE THIS FILE before going to production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const postId = searchParams.get("postId");

  try {
    const db = getDb();

    // Always show tokens + publications for context
    const xAccounts = await db.query.xAccounts.findMany();
    const tokenSummary = xAccounts.map((account) => ({
      userId: account.userId,
      hasAccessToken: Boolean(account.accessTokenCiphertext),
      accessTokenPreview: account.accessTokenCiphertext
        ? String(account.accessTokenCiphertext).slice(0, 20) + "..."
        : null,
      hasRefreshToken: Boolean(account.refreshTokenCiphertext),
      expiresAt: account.expiresAt?.toISOString() ?? null,
    }));

    const publications = await db.query.postPublications.findMany();
    const pubSummary = publications.map((pub) => ({
      postId: pub.postId,
      provider: pub.provider,
      status: pub.status,
      externalPostId: pub.externalPostId,
      lastError: pub.lastError,
    }));

    const baseInfo = {
      tokenAccounts: tokenSummary,
      publications: pubSummary,
      zernioApiKey: process.env.ZERNIO_API_KEY ? "SET (" + process.env.ZERNIO_API_KEY.slice(0, 10) + "...)" : "NOT SET",
      zernioProfileId: process.env.ZERNIO_PROFILE_ID ?? "NOT SET",
    };

    // If no action requested, just return diagnostics
    if (!action || !postId) {
      return NextResponse.json({
        ...baseInfo,
        usage: "Add ?action=retweet|reply|like&postId=xxx to test a Zernio sync call",
        timestamp: new Date().toISOString(),
      });
    }

    // Get the current user
    const cookieStore = await cookies();
    const viewerUserId = cookieStore.get("xcom_demo_user_id")?.value;
    if (!viewerUserId) {
      return NextResponse.json({ ...baseInfo, error: "No session cookie - log in first" }, { status: 401 });
    }

    // Get Zernio accountId for this user
    const xAccount = xAccounts.find((a) => a.userId === viewerUserId);
    if (!xAccount) {
      return NextResponse.json({
        ...baseInfo,
        error: `No xAccount found for userId=${viewerUserId}`,
        allUserIds: xAccounts.map((a) => a.userId),
      }, { status: 404 });
    }

    // In Zernio mode, accessTokenCiphertext IS the Zernio accountId (not encrypted)
    const accountId = String(xAccount.accessTokenCiphertext);

    // Get the external tweet ID
    const publication = publications.find(
      (p) => p.postId === postId && p.provider === "x" && p.status === "published",
    );
    if (!publication?.externalPostId) {
      return NextResponse.json({
        ...baseInfo,
        error: `No published tweet found for postId=${postId}`,
        matchingPubs: publications.filter((p) => p.postId === postId),
      }, { status: 404 });
    }

    const tweetId = publication.externalPostId;
    const testResult: Record<string, unknown> = {
      accountId,
      tweetId,
      postId,
      action,
    };

    // Test the actual Zernio API call
    const ZERNIO_API_BASE = "https://zernio.com/api/v1";
    const apiKey = process.env.ZERNIO_API_KEY!;

    if (action === "like") {
      const res = await fetch(`${ZERNIO_API_BASE}/twitter/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId, tweetId }),
      });
      const body = await res.text();
      testResult.status = res.status;
      testResult.statusText = res.statusText;
      testResult.responseBody = body;
      try { testResult.responseParsed = JSON.parse(body); } catch { /* ok */ }
    } else if (action === "retweet") {
      const res = await fetch(`${ZERNIO_API_BASE}/twitter/retweet`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId, tweetId }),
      });
      const body = await res.text();
      testResult.status = res.status;
      testResult.statusText = res.statusText;
      testResult.responseBody = body;
      try { testResult.responseParsed = JSON.parse(body); } catch { /* ok */ }
    } else if (action === "reply") {
      const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Test reply from x-com.fun debug endpoint",
          platforms: [
            {
              platform: "twitter",
              accountId,
              replyToTweetId: tweetId,
            },
          ],
          publishNow: true,
        }),
      });
      const body = await res.text();
      testResult.status = res.status;
      testResult.statusText = res.statusText;
      testResult.responseBody = body;
      try { testResult.responseParsed = JSON.parse(body); } catch { /* ok */ }
    } else {
      testResult.error = `Unknown action: ${action}. Use retweet, reply, or like.`;
    }

    return NextResponse.json({ ...baseInfo, test: testResult, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
