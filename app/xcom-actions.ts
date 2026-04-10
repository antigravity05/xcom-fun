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

// ── X/Twitter auto-sync helper ──
const publishToX = async (
  userId: string,
  postId: string,
  body: string,
  imageBase64Urls?: string[],
) => {
  try {
    const { queueXPublication } = await import(
      "@/lib/x/publication-contract"
    );
    const { getDb } = await import("@/lib/database/client");
    const { postPublications } = await import("@/drizzle/schema");

    const result = await queueXPublication({
      localPostId: postId,
      xAccountUserId: userId,
      body,
      imageBase64Urls,
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

const bodySchema = z.string().trim().min(2).max(1000);
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

  const bannerFile = formData.get("banner");
  let bannerUrl: string | undefined;

  try {
    if (bannerFile instanceof File && bannerFile.size > 0) {
      bannerUrl = await storeCommunityBanner(bannerFile, communitySlug);
    }

    await applyUpdateCommunity({
      actorUserId: viewerUserId,
      communitySlug,
      name: parsedPayload.data.name,
      description: parsedPayload.data.description,
      bannerUrl,
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

  // ── Handle image uploads — convert to base64 data URLs ──
  const imageFiles = formData.getAll("images") as File[];
  let media: import("@/lib/xcom-domain").CommunityPostMedia | undefined;

  if (imageFiles.length > 0 && imageFiles[0]?.size > 0) {
    const imageUrls: string[] = [];
    for (const file of imageFiles.slice(0, 4)) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      imageUrls.push(`data:${file.type};base64,${base64}`);
    }
    if (imageUrls.length > 0) {
      media = { kind: "images", urls: imageUrls };
    }
  }

  // Validate body — allow empty body if images are attached
  const rawBody = String(formData.get("body") ?? "").trim();
  let body: string;
  if (media) {
    // With images, body is optional (can be empty)
    if (rawBody.length > 1000) {
      const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be at most 1000 characters.")}`;
      redirect(errorUrl);
      return;
    }
    body = rawBody; // Can be empty for image-only posts
  } else {
    try {
      body = bodySchema.parse(rawBody);
    } catch {
      const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be between 2 and 1000 characters.")}`;
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
        await publishToX(viewerUserId, newPost.id, body, imageUrls);
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

  let body: string;
  try {
    body = bodySchema.parse(String(formData.get("body") ?? ""));
  } catch {
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Reply must be between 2 and 1000 characters.")}`;
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
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be between 2 and 1000 characters.")}`;
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
