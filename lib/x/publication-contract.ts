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
    const externalId =
      twitterResult?.platformPostId ??
      twitterResult?.postId ??
      null;

    console.log("[x-sync] Resolved externalPostId:", externalId, "| twitterResult:", JSON.stringify(twitterResult));

    if (!externalId) {
      // Tweet might have been posted on X but we couldn't get the ID back.
      // Mark as published but log a warning — replies won't work for this post.
      console.warn("[x-sync] WARNING: Tweet posted but no platformPostId returned. Zernio _id:", result._id ?? result.id);
      return {
        status: "published",
        externalPostId: undefined,
        errorMessage: "Tweet posted but external ID not returned by Zernio",
      };
    }

    return {
      status: "published",
      externalPostId: externalId,
    };
  } catch (error) {
    console.error("Zernio publication error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";

    // Handle Zernio Conflict (duplicate content) — the tweet may have already been posted
    if (msg.includes("Conflict")) {
      console.warn("[x-sync] Conflict error — content may already be posted on X");
      return {
        status: "failed",
        errorMessage: "Duplicate content — this tweet may already exist on X",
      };
    }

    return {
      status: "failed",
      errorMessage: msg,
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
