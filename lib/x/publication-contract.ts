import "server-only";

import type { PublicationStatus } from "@/lib/xcom-domain";
import { isZernioMode } from "@/lib/x/oauth-contract";
import { postTweet as zernioPostTweet } from "@/lib/zernio/client";
import { postTweet as xPostTweet, XAPIError } from "@/lib/x/x-api-client";
import { refreshAccessToken } from "@/lib/x/oauth-client";
import { decryptToken, encryptToken } from "@/lib/x/token-encryption";
import { getUserTokens, saveUserTokens } from "@/lib/x/token-store";

export type XPublicationIntent = {
  localPostId: string;
  xAccountUserId: string;
  body: string;
};

export type XPublicationResult = {
  status: PublicationStatus;
  externalPostId?: string;
  errorMessage?: string;
};

/**
 * Publish a tweet — routes through Zernio if configured,
 * otherwise falls back to direct X API.
 */
export const queueXPublication = async (
  intent: XPublicationIntent,
): Promise<XPublicationResult> => {
  if (isZernioMode()) {
    return publishViaZernio(intent);
  }
  return publishViaDirectXApi(intent);
};

/* ── Zernio path ── */

const publishViaZernio = async (
  intent: XPublicationIntent,
): Promise<XPublicationResult> => {
  try {
    // In Zernio mode, the stored "accessToken" is the Zernio accountId
    const storedTokens = await getUserTokens(intent.xAccountUserId);

    if (!storedTokens) {
      return {
        status: "failed",
        errorMessage: "No Zernio account linked for this user",
      };
    }

    const zernioAccountId = storedTokens.accessToken;
    const result = await zernioPostTweet(zernioAccountId, intent.body);

    // Log the full Zernio response so we can see the exact shape
    console.log("[x-sync] Zernio postTweet full response:", JSON.stringify(result));

    const twitterResult = result.platforms?.find(
      (p) => p.platform === "twitter",
    );

    if (twitterResult?.status === "error") {
      return {
        status: "failed",
        errorMessage: twitterResult.error ?? "Zernio posting failed",
      };
    }

    // Zernio returns the tweet ID as `platformPostId` (not `postId`)
    // IMPORTANT: Do NOT fall back to result._id / result.id — those are
    // Zernio internal IDs, not Twitter tweet IDs. Storing them breaks replies.
    let externalId =
      twitterResult?.platformPostId ??
      twitterResult?.postId ??
      null;

    console.log("[x-sync] Resolved externalPostId:", externalId, "| platformPostId:", twitterResult?.platformPostId, "| platformPostUrl:", twitterResult?.platformPostUrl);

    // If Zernio didn't return the tweet ID immediately (async publishing),
    // wait 2s and re-fetch from Zernio to get it.
    if (!externalId) {
      const zernioPostId = result._id ?? result.id;
      console.log(`[x-sync] No platformPostId in response. Waiting 2s then re-fetching from Zernio (zernioId=${zernioPostId})...`);
      await new Promise((r) => setTimeout(r, 2000));

      try {
        const { listRecentPosts } = await import("@/lib/zernio/client");
        const recentPosts = await listRecentPosts();
        const normalizedBody = intent.body.trim().toLowerCase();
        const match =
          recentPosts.find((p) => p.content.trim().toLowerCase() === normalizedBody) ??
          recentPosts.find((p) => p.zernioId === zernioPostId);
        if (match?.platformPostId) {
          externalId = match.platformPostId;
          console.log(`[x-sync] Got platformPostId from re-fetch: ${externalId}`);
        } else {
          console.warn("[x-sync] Still no platformPostId after re-fetch");
        }
      } catch (retryErr) {
        console.error("[x-sync] Re-fetch failed:", retryErr);
      }
    }

    return {
      status: "published",
      externalPostId: externalId ?? undefined,
    };
  } catch (error) {
    console.error("Zernio publication error:", error);
    return {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/* ── Direct X API path (legacy) ── */

const publishViaDirectXApi = async (
  intent: XPublicationIntent,
): Promise<XPublicationResult> => {
  try {
    const storedTokens = await getUserTokens(intent.xAccountUserId);

    if (!storedTokens) {
      return {
        status: "failed",
        errorMessage: "No OAuth tokens found for user",
      };
    }

    let accessToken = decryptToken(storedTokens.accessToken);
    let refreshToken = storedTokens.refreshToken
      ? decryptToken(storedTokens.refreshToken)
      : null;

    const expiresAt = new Date(storedTokens.expiresAt);
    const now = new Date();

    // Auto-refresh if expired
    if (now > expiresAt && refreshToken) {
      try {
        const refreshedTokens = await refreshAccessToken(refreshToken);
        accessToken = refreshedTokens.access_token;
        refreshToken = refreshedTokens.refresh_token ?? refreshToken;

        const encryptedAccessToken = encryptToken(accessToken);
        const encryptedRefreshToken = refreshToken
          ? encryptToken(refreshToken)
          : null;

        await saveUserTokens({
          userId: intent.xAccountUserId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(
            Date.now() + refreshedTokens.expires_in * 1000,
          ).toISOString(),
        });
      } catch (error) {
        console.error("Token refresh failed:", error);
        return {
          status: "failed",
          errorMessage: "Failed to refresh access token",
        };
      }
    }

    const result = await xPostTweet(accessToken, intent.body);

    return {
      status: "published",
      externalPostId: result.id,
    };
  } catch (error) {
    if (error instanceof XAPIError) {
      if (error.statusCode === 401) {
        return {
          status: "failed",
          errorMessage: "Unauthorized - access token expired or invalid",
        };
      }

      if (error.statusCode === 403) {
        return {
          status: "failed",
          errorMessage: "Forbidden - insufficient permissions",
        };
      }

      if (error.statusCode === 429) {
        return {
          status: "failed",
          errorMessage: "Rate limited - please try again later",
        };
      }
    }

    console.error("Publication error:", error);
    return {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
