import "server-only";

import type { PublicationStatus } from "@/lib/xcom-domain";
import { isZernioMode } from "@/lib/x/oauth-contract";
import { postTweet as zernioPostTweet } from "@/lib/zernio/client";
import { postTweet as xPostTweet, uploadMedia, XAPIError } from "@/lib/x/x-api-client";
import { refreshAccessToken } from "@/lib/x/oauth-client";
import { decryptToken, encryptToken } from "@/lib/x/token-encryption";
import { getUserTokens, saveUserTokens } from "@/lib/x/token-store";

export type XPublicationIntent = {
  localPostId: string;
  xAccountUserId: string;
  body: string;
  imageBase64Urls?: string[];
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

    // If body is empty but we have images, use minimal text for X compatibility
    const hasImages = intent.imageBase64Urls && intent.imageBase64Urls.length > 0;
    const tweetBody = intent.body.trim() || (hasImages ? "" : "");

    // Skip sync if no body and no images
    if (!tweetBody && !hasImages) {
      return {
        status: "published" as const,
        errorMessage: "Empty post — skipped X sync",
      };
    }

    // Pass images to Zernio via public URLs from our media API
    let imageUrls: string[] | undefined;
    if (hasImages) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.x-com.fun";
      imageUrls = intent.imageBase64Urls!.slice(0, 4).map(
        (_, i) => `${baseUrl}/api/media/${intent.localPostId}/${i}`,
      );
      console.log("[x-sync] Zernio media URLs:", imageUrls);
    }

    const result = await zernioPostTweet(zernioAccountId, tweetBody, imageUrls);

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
    const externalId =
      twitterResult?.platformPostId ??
      twitterResult?.postId ??
      result._id ??
      result.id ??
      null;

    console.log("[x-sync] Resolved externalPostId:", externalId, "| platformPostId:", twitterResult?.platformPostId, "| platformPostUrl:", twitterResult?.platformPostUrl);

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

    // Upload images if present
    let mediaIds: string[] | undefined;
    if (intent.imageBase64Urls && intent.imageBase64Urls.length > 0) {
      mediaIds = [];
      for (const imageUrl of intent.imageBase64Urls.slice(0, 4)) {
        try {
          const mimeMatch = imageUrl.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch?.[1] ?? "image/jpeg";
          console.log(`[x-sync] Uploading media, mimeType=${mimeType}, dataLength=${imageUrl.length}`);
          const mediaId = await uploadMedia(accessToken, imageUrl, mimeType);
          mediaIds.push(mediaId);
          console.log(`[x-sync] Uploaded media, got media_id: ${mediaId}`);
        } catch (uploadErr) {
          console.error("[x-sync] Media upload failed:", uploadErr);
        }
      }
      if (mediaIds.length === 0) mediaIds = undefined;
    }

    // Skip X sync if body is empty/whitespace and no media was uploaded
    const trimmedBody = intent.body.trim();
    if (!trimmedBody && !mediaIds) {
      console.log("[x-sync] Skipping X sync: no text body and no uploaded media");
      return {
        status: "published",
        errorMessage: "Image-only post — skipped X sync (media upload not supported yet)",
      };
    }

    // If body is empty but we have media, use a minimal text
    const tweetText = trimmedBody || ".";

    const result = await xPostTweet(accessToken, tweetText, mediaIds);

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
