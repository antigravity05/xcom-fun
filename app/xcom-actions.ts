"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  applyCreateCommunity,
  applyDeleteCommunity,
  applyDeletePost,
  applyCreatePost,
  applyCreateReply,
  applyJoinCommunity,
  applyLeaveCommunity,
  applySetMemberRole,
  applyToggleRepost,
  applyTogglePinnedPost,
  applyToggleLike,
  applyUpdateCommunity,
  applyUpdatePost,
  readXcomStore,
} from "@/lib/xcom-persistence";
import { clearViewerUserId, getViewerUserId, setViewerUserId } from "@/lib/xcom-session";
import { checkRateLimit } from "@/lib/rate-limit";

// ── Post view tracking ──
export async function recordPostView(postId: string) {
  if (!postId || !process.env.DATABASE_URL) return;
  try {
    const { getDb } = await import("@/lib/database/client");
    const { posts } = await import("@/drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");
    const db = getDb();
    await db
      .update(posts)
      .set({ viewCount: sql`COALESCE(${posts.viewCount}, 0) + 1` })
      .where(eq(posts.id, postId));
  } catch (err) {
    // Silently fail — views are non-critical
    console.error("[recordPostView] Failed:", err);
  }
}

// ── X/Twitter auto-sync helper ──
// Communities that get the "x-com.fun" suffix appended to synced tweets.
// Keep narrow for now, we only want this on our own community so new
// users of other communities don't feel like we're hijacking their tweets.
const X_SUFFIX_COMMUNITY_SLUGS = new Set(["x-fun-com-community"]);
const X_SUFFIX = "\n\nx-com.fun";

const publishToX = async (
  userId: string,
  postId: string,
  body: string,
  imageBase64Urls?: string[],
  quoteTweetId?: string,
  communitySlug?: string,
  videoBase64Url?: string,
) => {
  try {
    const { queueXPublication } = await import(
      "@/lib/x/publication-contract"
    );
    const { getDb } = await import("@/lib/database/client");
    const { postPublications } = await import("@/drizzle/schema");

    // Append "x-com.fun" suffix only for posts in our own community,
    // keeping the 25000 char X Premium limit.
    let bodyWithSuffix = body;
    if (communitySlug && X_SUFFIX_COMMUNITY_SLUGS.has(communitySlug)) {
      const withSuffix = `${body}${X_SUFFIX}`;
      if (withSuffix.length <= 25000) {
        bodyWithSuffix = withSuffix;
      } else {
        // Body is already at the limit, trim to fit the suffix.
        bodyWithSuffix = body.slice(0, 25000 - X_SUFFIX.length) + X_SUFFIX;
      }
    }

    // Truncate body to 25000 chars for X Premium (add ellipsis if truncated)
    const xBody =
      bodyWithSuffix.length > 25000
        ? bodyWithSuffix.slice(0, 24997) + "..."
        : bodyWithSuffix;

    const result = await queueXPublication({
      localPostId: postId,
      xAccountUserId: userId,
      body: xBody,
      imageBase64Urls,
      videoBase64Url,
      quoteTweetId,
    });

    // Validate: Twitter tweet IDs are purely numeric.
    let tweetId = result.externalPostId ?? null;
    if (tweetId && !/^\d+$/.test(tweetId)) {
      console.warn(`[x-sync] Discarding non-numeric externalPostId "${tweetId}"`);
      tweetId = null;
    }

    console.log(`[x-sync] publishToX result: status=${result.status}, tweetId=${tweetId}`);

    // Record the publication attempt in the DB
    try {
      const db = getDb();
      const { eq, and } = await import("drizzle-orm");
      const existing = await db.query.postPublications.findFirst({
        where: (table, ops) =>
          ops.and(ops.eq(table.postId, postId), ops.eq(table.provider, "x")),
      });
      if (existing) {
        await db.update(postPublications).set({
          status: result.status === "published" ? "published" : "failed",
          externalPostId: tweetId ?? existing.externalPostId,
          lastError: result.errorMessage ?? null,
          attemptCount: (existing.attemptCount ?? 0) + 1,
          lastAttemptAt: new Date(),
        }).where(and(eq(postPublications.postId, postId), eq(postPublications.provider, "x")));
      } else {
        await db.insert(postPublications).values({
          postId,
          provider: "x",
          status: result.status === "published" ? "published" : "failed",
          externalPostId: tweetId,
          lastError: result.errorMessage ?? null,
          attemptCount: 1,
          lastAttemptAt: new Date(),
        });
      }
      console.log(`[x-sync] DB save OK: postId=${postId}, externalPostId=${tweetId}, existing=${!!existing}`);
    } catch (dbErr) {
      console.error("[x-sync] CRITICAL: Failed to record publication to DB:", dbErr);
    }

    if (result.status === "published") {
      console.log(
        `[x-sync] Post ${postId} published as tweet ${result.externalPostId}`,
      );
    } else {
      console.warn(
        `[x-sync] Post ${postId} failed to publish: ${result.errorMessage}`,
      );
    }
  } catch (err) {
    console.error("[x-sync] publishToX error:", err);
  }
};

// ── Helpers for X sync credentials ──

type XSyncCredentials =
  | { mode: "zernio"; accountId: string }
  | { mode: "direct"; accessToken: string; xUserId: string };

/**
 * Get credentials for X sync operations.
 * - In Zernio mode: returns the Zernio accountId (stored as accessToken)
 * - In direct X API mode: returns decrypted + auto-refreshed OAuth token + xUserId
 */
const getXSyncCredentials = async (userId: string): Promise<XSyncCredentials | null> => {
  try {
    const { isZernioMode } = await import("@/lib/x/oauth-contract");
    const { getUserTokens, saveUserTokens } = await import("@/lib/x/token-store");
    const tokens = await getUserTokens(userId);
    if (!tokens) {
      console.warn("[x-sync] No tokens found for user", userId);
      return null;
    }

    if (isZernioMode()) {
      // In Zernio mode, accessToken field holds the Zernio accountId (unencrypted)
      return { mode: "zernio", accountId: tokens.accessToken };
    }

    // Direct X API mode — decrypt tokens and auto-refresh if needed
    const { decryptToken, encryptToken } = await import("@/lib/x/token-encryption");
    let accessToken = decryptToken(tokens.accessToken);
    let refreshToken = tokens.refreshToken ? decryptToken(tokens.refreshToken) : null;

    const expiresAt = new Date(tokens.expiresAt);
    if (new Date() > expiresAt && refreshToken) {
      try {
        const { refreshAccessToken } = await import("@/lib/x/oauth-client");
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.access_token;
        refreshToken = refreshed.refresh_token ?? refreshToken;
        await saveUserTokens({
          userId,
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : null,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        });
        console.log("[x-sync] Auto-refreshed X OAuth token for user", userId);
      } catch (err) {
        console.error("[x-sync] Token refresh failed:", err);
        return null;
      }
    }

    // Get the user's X user ID from the DB
    const snapshot = await readXcomStore();
    const user = snapshot.users.find((u) => u.id === userId);
    if (!user?.xUserId) {
      console.warn("[x-sync] No xUserId found for user", userId);
      return null;
    }

    return { mode: "direct", accessToken, xUserId: user.xUserId };
  } catch (err) {
    console.error("[x-sync] getXSyncCredentials error:", err);
    return null;
  }
};

/** Legacy alias — kept for getExternalTweetId which only needs the accountId */
const getZernioAccountId = async (userId: string): Promise<string | null> => {
  const creds = await getXSyncCredentials(userId);
  if (!creds) return null;
  return creds.mode === "zernio" ? creds.accountId : null;
};

/** Get the external tweet ID for a local post from postPublications DB. */
const getExternalTweetId = async (postId: string): Promise<string | null> => {
  try {
    console.log(`[x-sync] getExternalTweetId: looking up postId=${postId}`);
    const { getDb } = await import("@/lib/database/client");
    const db = getDb();

    const row = await db.query.postPublications.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.postId, postId), eq(table.provider, "x")),
    });

    console.log(`[x-sync] getExternalTweetId: DB row =`, row ? `{ status: ${row.status}, externalPostId: ${row.externalPostId} }` : "null");

    if (row?.externalPostId && /^\d+$/.test(row.externalPostId)) {
      console.log(`[x-sync] getExternalTweetId: found valid tweet ID ${row.externalPostId}`);
      return row.externalPostId;
    }

    console.warn(`[x-sync] getExternalTweetId: no valid tweet ID found for postId=${postId}`);
    return null;
  } catch (err) {
    console.error("[x-sync] getExternalTweetId error:", err);
    return null;
  }
};

// ── X/Twitter engagement sync helpers ──

const syncLikeToX = async (userId: string, postId: string, isLiking: boolean) => {
  try {
    console.log(`[x-sync] syncLikeToX: userId=${userId}, postId=${postId}, isLiking=${isLiking}`);
    const creds = await getXSyncCredentials(userId);
    if (!creds) {
      console.warn("[x-sync] syncLikeToX: no credentials for user", userId);
      return;
    }

    const tweetId = await getExternalTweetId(postId);
    if (!tweetId) {
      console.warn("[x-sync] syncLikeToX: no external tweetId for post", postId);
      return;
    }

    if (creds.mode === "direct") {
      const { likeTweet, unlikeTweet } = await import("@/lib/x/x-api-client");
      if (isLiking) {
        await likeTweet(creds.accessToken, creds.xUserId, tweetId);
        console.log(`[x-sync] Liked tweet ${tweetId} via direct X API`);
      } else {
        await unlikeTweet(creds.accessToken, creds.xUserId, tweetId);
        console.log(`[x-sync] Unliked tweet ${tweetId} via direct X API`);
      }
    } else {
      // Zernio does NOT support /twitter/like — likes are local only
      console.warn(`[x-sync] syncLikeToX: Zernio mode — likes cannot sync to X (local only)`);
    }
  } catch (err) {
    console.error("[x-sync] syncLikeToX error:", err);
  }
};

const syncRetweetToX = async (userId: string, postId: string, isRetweeting: boolean) => {
  try {
    const creds = await getXSyncCredentials(userId);
    if (!creds) {
      console.warn("[x-sync] syncRetweetToX: no credentials for user", userId);
      return;
    }

    const tweetId = await getExternalTweetId(postId);
    if (!tweetId) {
      console.warn("[x-sync] syncRetweetToX: no external tweetId for post", postId);
      return;
    }

    if (creds.mode === "direct") {
      const { retweet, undoRetweet } = await import("@/lib/x/x-api-client");
      if (isRetweeting) {
        await retweet(creds.accessToken, creds.xUserId, tweetId);
        console.log(`[x-sync] Retweeted tweet ${tweetId} via direct X API`);
      } else {
        await undoRetweet(creds.accessToken, creds.xUserId, tweetId);
        console.log(`[x-sync] Undid retweet ${tweetId} via direct X API`);
      }
    } else {
      console.log(`[x-sync] syncRetweetToX: using Zernio`);
      const { retweetPost, undoRetweet } = await import("@/lib/zernio/client");
      if (isRetweeting) {
        await retweetPost(creds.accountId, tweetId);
        console.log(`[x-sync] Retweeted tweet ${tweetId} via Zernio`);
      } else {
        await undoRetweet(creds.accountId, tweetId);
        console.log(`[x-sync] Undid retweet ${tweetId} via Zernio`);
      }
    }
  } catch (err) {
    console.error("[x-sync] syncRetweetToX error:", err);
  }
};

const syncReplyToX = async (userId: string, postId: string, body: string) => {
  try {
    console.log(`[x-sync] syncReplyToX: userId=${userId}, postId=${postId}, body="${body.slice(0, 50)}..."`);
    const creds = await getXSyncCredentials(userId);
    if (!creds) {
      console.warn("[x-sync] syncReplyToX: no credentials for user", userId);
      return;
    }
    console.log(`[x-sync] syncReplyToX: mode=${creds.mode}`);

    const tweetId = await getExternalTweetId(postId);
    console.log(`[x-sync] syncReplyToX: getExternalTweetId returned: ${tweetId}`);

    if (!tweetId || !/^\d+$/.test(tweetId)) {
      // No parent tweet ID — skip X sync entirely (don't pollute timeline with standalone tweets)
      console.warn(`[x-sync] syncReplyToX: no valid parent tweet ID (got: ${tweetId}) for postId=${postId} — skipping X sync (reply stays local only)`);
      return;
    }

    if (creds.mode === "direct") {
      const { replyToTweet } = await import("@/lib/x/x-api-client");
      const result = await replyToTweet(creds.accessToken, tweetId, body);
      console.log(`[x-sync] Replied to tweet ${tweetId} via direct X API:`, JSON.stringify(result));
    } else {
      // Zernio mode
      const { replyToTweet } = await import("@/lib/zernio/client");
      const result = await replyToTweet(creds.accountId, tweetId, body);
      console.log(`[x-sync] Replied to tweet ${tweetId} via Zernio:`, JSON.stringify(result));
    }
  } catch (err) {
    console.error("[x-sync] syncReplyToX error:", err);
  }
};

const createCommunityPayloadSchema = z.object({
  name: z.string().min(3).max(32),
  description: z.string().min(10).max(420),
});

const bodySchema = z.string().trim().min(2).max(25000);
const maxBannerSizeBytes = 5 * 1024 * 1024;

const slugifyCommunityName = (value: string) => {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
};

const makeTickerFromName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const compact = parts
    .slice(0, 4)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");

  return (compact || value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "XCOM").slice(0, 8);
};

const makeTaglineFromDescription = (value: string) => {
  return value.trim().slice(0, 90);
};

const makeUniqueSlug = (baseSlug: string, takenSlugs: string[]) => {
  const normalizedBase = baseSlug || "community";

  if (!takenSlugs.includes(normalizedBase)) {
    return normalizedBase;
  }

  let counter = 2;

  while (takenSlugs.includes(`${normalizedBase}-${counter}`)) {
    counter += 1;
  }

  return `${normalizedBase}-${counter}`;
};

const detectImageExtension = (bytes: Uint8Array) => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
  }

  return null;
};

const mimeForExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const storeCommunityBanner = async (file: File, slug: string) => {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Banner image is required.");
  }

  if (file.size > maxBannerSizeBytes) {
    throw new Error("Banner image must stay under 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectImageExtension(bytes);

  if (!extension) {
    throw new Error("Banner must be a PNG, JPG, WEBP or GIF image.");
  }

  // In production (Vercel), the filesystem is read-only.
  // Store the image as a data URL. For a real production app you'd use
  // an object storage service (e.g. Vercel Blob, S3, Cloudflare R2).
  if (process.env.VERCEL || process.env.DATABASE_URL) {
    const mime = mimeForExtension[extension] ?? "application/octet-stream";
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mime};base64,${base64}`;
  }

  // Local dev: write to public/uploads
  const path = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const bannerUploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "community-banners",
  );
  await mkdir(bannerUploadDirectory, { recursive: true });

  const fileName = `${slug}-${randomUUID()}.${extension}`;
  const filePath = path.join(bannerUploadDirectory, fileName);

  await writeFile(filePath, bytes);

  return `/uploads/community-banners/${fileName}`;
};

export const connectDemoAccountAction = async (formData: FormData) => {
  const userId = String(formData.get("userId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const snapshot = await readXcomStore();
  const user = snapshot.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Demo account not found.");
  }

  await setViewerUserId(userId);
  updateTag("xcom-store");
  revalidatePath("/");
  redirect(redirectTo);
};

export const disconnectDemoAccountAction = async (formData: FormData) => {
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  await clearViewerUserId();
  updateTag("xcom-store");
  revalidatePath("/");
  redirect(redirectTo);
};

export const createCommunityAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();

  if (!viewerUserId) {
    return {
      ok: false as const,
      error: "Connect a demo X account before creating a community.",
    };
  }

  const rateCheck = checkRateLimit(`community:${viewerUserId}`, 5, 3_600_000);
  if (!rateCheck.allowed) {
    return {
      ok: false as const,
      error: "You're creating communities too fast. Please wait a while.",
    };
  }

  const parsedPayload = createCommunityPayloadSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsedPayload.success) {
    return {
      ok: false as const,
      error: parsedPayload.error.issues[0]?.message ?? "Invalid community payload.",
    };
  }

  const snapshot = await readXcomStore();
  const takenSlugs = snapshot.communities.map((entry) => entry.slug);
  const slug = makeUniqueSlug(
    slugifyCommunityName(parsedPayload.data.name),
    takenSlugs,
  );
  const bannerFile = formData.get("banner");

  try {
    if (!(bannerFile instanceof File)) {
      throw new Error("Banner image is required.");
    }

    const bannerUrl = await storeCommunityBanner(bannerFile, slug);

    await applyCreateCommunity({
      actorUserId: viewerUserId,
      slug,
      name: parsedPayload.data.name,
      ticker: makeTickerFromName(parsedPayload.data.name),
      tagline: makeTaglineFromDescription(parsedPayload.data.description),
      description: parsedPayload.data.description,
      bannerUrl,
      rules: ["Stay on topic.", "No spam.", "Keep the feed readable."],
    });
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Unable to save banner image.",
    };
  }

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath("/create-community");

  return {
    ok: true as const,
    slug,
  };
};

export const updateCommunityAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();

  if (!viewerUserId) {
    return {
      ok: false as const,
      error: "Connect a demo X account before editing a community.",
    };
  }

  const communitySlug = String(formData.get("communitySlug") ?? "");
  const parsedPayload = createCommunityPayloadSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsedPayload.success) {
    return {
      ok: false as const,
      error: parsedPayload.error.issues[0]?.message ?? "Invalid community payload.",
    };
  }

  const bannerData = formData.get("banner");
  const thumbnailData = formData.get("thumbnail");
  const contractAddress = String(formData.get("contractAddress") ?? "").trim() || undefined;
  let bannerUrl: string | undefined;
  let thumbnailUrl: string | undefined;

  try {
    if (bannerData instanceof File && bannerData.size > 0) {
      bannerUrl = await storeCommunityBanner(bannerData, communitySlug);
    } else if (typeof bannerData === "string" && bannerData.startsWith("data:")) {
      const res = await fetch(bannerData);
      const blob = await res.blob();
      const file = new File([blob], `banner-${communitySlug}.jpg`, { type: blob.type });
      bannerUrl = await storeCommunityBanner(file, communitySlug);
    }

    if (typeof thumbnailData === "string" && thumbnailData.startsWith("data:")) {
      const res = await fetch(thumbnailData);
      const blob = await res.blob();
      const file = new File([blob], `thumb-${communitySlug}.jpg`, { type: blob.type });
      thumbnailUrl = await storeCommunityBanner(file, `${communitySlug}-thumb`);
    }

    await applyUpdateCommunity({
      actorUserId: viewerUserId,
      communitySlug,
      name: parsedPayload.data.name,
      description: parsedPayload.data.description,
      bannerUrl,
      thumbnailUrl,
      contractAddress,
    });
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Unable to update community.",
    };
  }

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);

  return {
    ok: true as const,
    slug: communitySlug,
  };
};

export const deleteCommunityAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const communitySlug = String(formData.get("communitySlug") ?? "");

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent("/")}`);
  }

  await applyDeleteCommunity({
    actorUserId: viewerUserId,
    communitySlug,
  });

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath("/create-community");
  revalidatePath(`/communities/${communitySlug}`);
  redirect("/");
};

export const joinCommunityAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  await applyJoinCommunity({
    actorUserId: viewerUserId,
    communitySlug,
  });

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const leaveCommunityAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  await applyLeaveCommunity({
    actorUserId: viewerUserId,
    communitySlug,
  });

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const createPostAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // ── Rate limit: max 5 posts per 60 seconds per user ──
  const rateCheck = checkRateLimit(`post:${viewerUserId}`, 5, 60_000);
  if (!rateCheck.allowed) {
    const seconds = Math.ceil(rateCheck.retryAfterMs / 1000);
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(`Too many posts. Please wait ${seconds}s before posting again.`)}`;
    redirect(errorUrl);
    return;
  }

  // ── Handle media uploads — convert to base64 data URLs ──
  // Accept images (up to 4, 5MB each) OR a single video (up to 8MB).
  // Backward compat: old clients sent "images", new composer sends "media".
  const rawFiles = [
    ...(formData.getAll("media") as File[]),
    ...(formData.getAll("images") as File[]),
  ];
  const mediaFiles = rawFiles.filter((f) => f instanceof File && f.size > 0);
  let media: import("@/lib/xcom-domain").CommunityPostMedia | undefined;

  if (mediaFiles.length > 0) {
    const first = mediaFiles[0];
    if (first.type.startsWith("video/")) {
      if (first.size > 8 * 1024 * 1024) {
        const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Video must be under 8 MB.")}`;
        redirect(errorUrl);
        return;
      }
      const buffer = Buffer.from(await first.arrayBuffer());
      const base64 = buffer.toString("base64");
      media = {
        kind: "video",
        url: `data:${first.type};base64,${base64}`,
      };
    } else {
      const imageUrls: string[] = [];
      for (const file of mediaFiles.slice(0, 4)) {
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        imageUrls.push(`data:${file.type};base64,${base64}`);
      }
      if (imageUrls.length > 0) {
        media = { kind: "images", urls: imageUrls };
      }
    }
  }

  // Validate body — allow empty body if media is attached
  const rawBody = String(formData.get("body") ?? "").trim();
  let body: string;
  if (media) {
    // With media, body is optional (can be empty)
    if (rawBody.length > 25000) {
      const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be at most 25000 characters.")}`;
      redirect(errorUrl);
      return;
    }
    body = rawBody; // Can be empty for media-only posts
  } else {
    try {
      body = bodySchema.parse(rawBody);
    } catch {
      const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be between 2 and 25000 characters.")}`;
      redirect(errorUrl);
      return;
    }
  }

  let nextSnapshot;
  try {
    nextSnapshot = await applyCreatePost({
      actorUserId: viewerUserId,
      communitySlug,
      body,
      media,
    });
  } catch (err) {
    console.error("[createPostAction] Failed to create post:", err);
    const message = err instanceof Error ? err.message : "Failed to create post.";
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(message)}`;
    redirect(errorUrl);
    return;
  }

  // ── X/Twitter sync via Zernio — must await before redirect ──
  // On Vercel serverless, fire-and-forget promises get killed when redirect() sends the response.
  const community = nextSnapshot.communities.find((c) => c.slug === communitySlug);
  if (community) {
    // Find the NEWEST post by this user (last in array = most recently created)
    const userPostsInCommunity = nextSnapshot.posts.filter(
      (p) =>
        p.communityId === community.id &&
        p.authorUserId === viewerUserId,
    );
    // createPost uses unshift (adds to beginning), so the newest post is FIRST
    const newPost = userPostsInCommunity[0];
    if (newPost) {
      console.log(`[x-sync] Publishing post ${newPost.id} (body: "${body.slice(0, 30)}") to X`);
      try {
        const imageUrls = media?.kind === "images" ? media.urls : undefined;
        const videoUrl = media?.kind === "video" ? media.url : undefined;
        await publishToX(viewerUserId, newPost.id, body, imageUrls, undefined, communitySlug, videoUrl);
      } catch (err) {
        console.error("[x-sync] Publication failed:", err);
      }
    } else {
      console.warn("[x-sync] Could not find new post to publish");
    }
  }

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const createReplyAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const postId = String(formData.get("postId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // ── Rate limit: max 10 replies per 60 seconds per user ──
  const rateCheck = checkRateLimit(`reply:${viewerUserId}`, 10, 60_000);
  if (!rateCheck.allowed) {
    const seconds = Math.ceil(rateCheck.retryAfterMs / 1000);
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(`Too many replies. Please wait ${seconds}s.`)}`;
    redirect(errorUrl);
    return;
  }

  let body: string;
  try {
    body = bodySchema.parse(String(formData.get("body") ?? ""));
  } catch {
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Reply must be between 2 and 25000 characters.")}`;
    redirect(errorUrl);
    return;
  }

  try {
    await applyCreateReply({
      actorUserId: viewerUserId,
      postId,
      body,
    });
  } catch (err) {
    console.error("[createReplyAction] Failed to create reply:", err);
    const message = err instanceof Error ? err.message : "Failed to create reply.";
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(message)}`;
    redirect(errorUrl);
    return;
  }

  // Sync reply to X — must await before redirect (serverless kills fire-and-forget)
  try {
    await syncReplyToX(viewerUserId, postId, body);
  } catch (err) {
    console.error("[x-sync] Reply sync failed:", err);
  }

  updateTag("xcom-store");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const updatePostAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const postId = String(formData.get("postId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  let body: string;
  try {
    body = bodySchema.parse(String(formData.get("body") ?? ""));
  } catch {
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be between 2 and 25000 characters.")}`;
    redirect(errorUrl);
    return;
  }

  try {
    await applyUpdatePost({
      actorUserId: viewerUserId,
      postId,
      body,
    });
  } catch (err) {
    console.error("[updatePostAction] Failed to update post:", err);
    const message = err instanceof Error ? err.message : "Failed to update post.";
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(message)}`;
    redirect(errorUrl);
    return;
  }

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const deletePostAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const postId = String(formData.get("postId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  try {
    await applyDeletePost({
      actorUserId: viewerUserId,
      postId,
    });
  } catch (err) {
    console.error("[deletePostAction] Failed to delete post:", err);
    const message = err instanceof Error ? err.message : "Failed to delete post.";
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(message)}`;
    redirect(errorUrl);
    return;
  }

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const togglePinnedPostAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const postId = String(formData.get("postId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  try {
    await applyTogglePinnedPost({
      actorUserId: viewerUserId,
      postId,
    });
  } catch (err) {
    console.error("[togglePinnedPostAction] Failed:", err);
    redirect(redirectTo);
    return;
  }

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const toggleRepostAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const postId = String(formData.get("postId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // Check current state to determine if we're retweeting or undoing
  let wasReposted = false;
  try {
    const snapshot = await readXcomStore();
    wasReposted = snapshot.reactions.some(
      (r) => r.postId === postId && r.userId === viewerUserId && r.kind === "repost",
    );
  } catch { /* ignore */ }

  try {
    await applyToggleRepost({
      actorUserId: viewerUserId,
      postId,
    });
  } catch (err) {
    console.error("[toggleRepostAction] Failed:", err);
    redirect(redirectTo);
    return;
  }

  // Sync to X — must await before redirect (serverless kills fire-and-forget)
  try {
    await syncRetweetToX(viewerUserId, postId, !wasReposted);
  } catch (err) {
    console.error("[x-sync] Retweet sync failed:", err);
  }

  updateTag("xcom-store");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const quoteRepostAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const quotedPostId = String(formData.get("quotedPostId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const body = String(formData.get("body") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (!body.trim()) {
    redirect(redirectTo);
    return;
  }

  // Get the community ID from slug
  const snapshot = await readXcomStore();
  const community = snapshot.communities.find((c) => c.slug === communitySlug);
  if (!community) {
    redirect(redirectTo);
    return;
  }

  // Create the quote post on x-com.fun (same as creating a regular post, with quotedPostId)
  let newPostId: string | undefined;
  try {
    const { applyCreatePost } = await import("@/lib/xcom-persistence");
    const nextSnapshot = await applyCreatePost({
      actorUserId: viewerUserId,
      communitySlug,
      body,
      quotedPostId,
    });
    // Find the newly created post
    const newPost = nextSnapshot.posts.find(
      (p) => p.authorUserId === viewerUserId && p.body === body && p.quotedPostId === quotedPostId,
    );
    newPostId = newPost?.id;
  } catch (err) {
    console.error("[quoteRepostAction] Failed to create post:", err);
    redirect(redirectTo);
    return;
  }

  if (!newPostId) {
    console.error("[quoteRepostAction] Could not find newly created post");
    redirect(redirectTo);
    return;
  }

  // Get the external tweet ID of the quoted post for X sync
  const quotedExternalTweetId = await getExternalTweetId(quotedPostId);

  // Sync to X as a quote tweet
  try {
    await publishToX(viewerUserId, newPostId, body, undefined, quotedExternalTweetId ?? undefined, communitySlug);
  } catch (err) {
    console.error("[x-sync] Quote repost sync failed:", err);
  }

  updateTag("xcom-store");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const setMemberRoleAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const roleValue = String(formData.get("role") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}?tab=members`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (roleValue !== "member" && roleValue !== "moderator") {
    throw new Error("Invalid role.");
  }

  await applySetMemberRole({
    actorUserId: viewerUserId,
    communitySlug,
    targetUserId,
    role: roleValue,
  });

  updateTag("xcom-store");
  revalidatePath("/");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

export const toggleLikeAction = async (formData: FormData) => {
  const viewerUserId = await getViewerUserId();
  const postId = String(formData.get("postId") ?? "");
  const communitySlug = String(formData.get("communitySlug") ?? "");
  const redirectTo = String(
    formData.get("redirectTo") ?? `/communities/${communitySlug}`,
  );

  if (!viewerUserId) {
    redirect(`/connect-x?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // Check current state to determine if we're liking or unliking
  let wasLiked = false;
  try {
    const snapshot = await readXcomStore();
    wasLiked = snapshot.reactions.some(
      (r) => r.postId === postId && r.userId === viewerUserId && r.kind === "like",
    );
  } catch { /* ignore — we'll still toggle locally */ }

  try {
    await applyToggleLike({
      actorUserId: viewerUserId,
      postId,
    });
  } catch (err) {
    console.error("[toggleLikeAction] Failed:", err);
    redirect(redirectTo);
    return;
  }

  // Sync to X — must await before redirect (serverless kills fire-and-forget)
  try {
    await syncLikeToX(viewerUserId, postId, !wasLiked);
  } catch (err) {
    console.error("[x-sync] Like sync failed:", err);
  }

  updateTag("xcom-store");
  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};

// ── Bug reports ──

const bugReportSchema = z.object({
  message: z.string().trim().min(5, "Please describe the bug (min 5 chars).").max(5000),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pageUrl: z.string().trim().max(500).optional(),
  userAgent: z.string().trim().max(500).optional(),
});

export const reportBugAction = async (
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const viewerUserId = await getViewerUserId();

  // Rate limit — 5 reports per hour per user, or per-IP for anonymous
  const rateKey = viewerUserId
    ? `bug:${viewerUserId}`
    : `bug:anon:${randomUUID().slice(0, 8)}`;
  const rateCheck = checkRateLimit(rateKey, 5, 3_600_000);
  if (!rateCheck.allowed) {
    return {
      ok: false as const,
      error: "You're submitting too many reports. Please wait a bit.",
    };
  }

  const parsed = bugReportSchema.safeParse({
    message: String(formData.get("message") ?? ""),
    email: String(formData.get("email") ?? ""),
    pageUrl: String(formData.get("pageUrl") ?? ""),
    userAgent: String(formData.get("userAgent") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const payload = parsed.data;

  // Always log to server logs so we see it in Vercel even if DB is down
  console.log(
    `[BUG REPORT] user=${viewerUserId ?? "anon"} page=${payload.pageUrl ?? "?"} email=${payload.email ?? "—"}\n${payload.message}`,
  );

  if (!process.env.DATABASE_URL) {
    // Dev / no DB — already logged to console, treat as success
    return { ok: true as const };
  }

  try {
    const { getDb } = await import("@/lib/database/client");
    const { bugReports } = await import("@/drizzle/schema");
    const db = getDb();
    await db.insert(bugReports).values({
      userId: viewerUserId ?? null,
      message: payload.message,
      pageUrl: payload.pageUrl ?? null,
      userAgent: payload.userAgent ?? null,
      email: payload.email ?? null,
    });
  } catch (err) {
    console.error("[reportBugAction] DB insert failed:", err);
    return {
      ok: false as const,
      error: "Could not save your report. Please try again later.",
    };
  }

  return { ok: true as const };
};
