"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
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
    });

    // Record the publication attempt in the DB (upsert to avoid duplicates)
    try {
      const db = getDb();
      const { eq, and } = await import("drizzle-orm");
      // Check if a publication row already exists
      const existing = await db.query.postPublications.findFirst({
        where: (table, ops) =>
          ops.and(ops.eq(table.postId, postId), ops.eq(table.provider, "x")),
      });
      if (existing) {
        // Update existing row
        await db.update(postPublications).set({
          status: result.status === "published" ? "published" : "failed",
          externalPostId: result.externalPostId ?? existing.externalPostId,
          lastError: result.errorMessage ?? null,
          attemptCount: (existing.attemptCount ?? 0) + 1,
          lastAttemptAt: new Date(),
        }).where(and(eq(postPublications.postId, postId), eq(postPublications.provider, "x")));
      } else {
        await db.insert(postPublications).values({
          postId,
          provider: "x",
          status: result.status === "published" ? "published" : "failed",
          externalPostId: result.externalPostId ?? null,
          lastError: result.errorMessage ?? null,
          attemptCount: 1,
          lastAttemptAt: new Date(),
        });
      }
    } catch (dbErr) {
      console.error("[x-sync] Failed to record publication:", dbErr);
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

// ── Helpers to get Zernio account ID and external tweet ID ──

/** Get the user's Zernio account ID from the token store. */
const getZernioAccountId = async (userId: string): Promise<string | null> => {
  try {
    const { isZernioMode } = await import("@/lib/x/oauth-contract");
    const zernio = isZernioMode();
    console.log(`[x-sync] getZernioAccountId: isZernioMode=${zernio}, userId=${userId}`);
    if (!zernio) return null;

    const { getUserTokens } = await import("@/lib/x/token-store");
    const tokens = await getUserTokens(userId);
    console.log(`[x-sync] getZernioAccountId: hasTokens=${Boolean(tokens)}, accessToken=${tokens?.accessToken ? tokens.accessToken.slice(0, 15) + "..." : "NULL"}`);
    return tokens?.accessToken ?? null;
  } catch (err) {
    console.error("[x-sync] getZernioAccountId ERROR:", err);
    return null;
  }
};

/** Get the external tweet ID for a local post (from postPublications). */
const getExternalTweetId = async (postId: string): Promise<string | null> => {
  try {
    const { getDb } = await import("@/lib/database/client");
    const db = getDb();
    console.log(`[x-sync] getExternalTweetId: looking up postId=${postId}`);

    // First check if ANY publication row exists for this post
    const anyRow = await db.query.postPublications.findFirst({
      where: (table, { eq }) => eq(table.postId, postId),
    });
    console.log(`[x-sync] getExternalTweetId: anyRow=${JSON.stringify(anyRow ? { postId: anyRow.postId, provider: anyRow.provider, status: anyRow.status, externalPostId: anyRow.externalPostId } : null)}`);

    // Now query with full filter
    const row = await db.query.postPublications.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.postId, postId), eq(table.provider, "x"), eq(table.status, "published")),
    });
    console.log(`[x-sync] getExternalTweetId: publishedRow externalPostId=${row?.externalPostId ?? "NULL"}`);
    return row?.externalPostId ?? null;
  } catch (err) {
    console.error("[x-sync] getExternalTweetId ERROR:", err);
    return null;
  }
};

// ── X/Twitter engagement sync helpers (fire-and-forget) ──

const syncLikeToX = async (userId: string, postId: string, isLiking: boolean) => {
  try {
    const accountId = await getZernioAccountId(userId);
    if (!accountId) return;

    const tweetId = await getExternalTweetId(postId);
    if (!tweetId) return;

    const { likeTweet, unlikeTweet } = await import("@/lib/zernio/client");
    if (isLiking) {
      await likeTweet(accountId, tweetId);
      console.log(`[x-sync] Liked tweet ${tweetId}`);
    } else {
      await unlikeTweet(accountId, tweetId);
      console.log(`[x-sync] Unliked tweet ${tweetId}`);
    }
  } catch (err) {
    console.error("[x-sync] syncLikeToX error:", err);
  }
};

const syncRetweetToX = async (userId: string, postId: string, isRetweeting: boolean) => {
  console.log(`[x-sync] ===== syncRetweetToX START =====`);
  console.log(`[x-sync] syncRetweetToX called with userId=${userId}, postId=${postId}, isRetweeting=${isRetweeting}`);
  try {
    const accountId = await getZernioAccountId(userId);
    if (!accountId) {
      console.warn("[x-sync] syncRetweetToX: ABORT - no accountId for user", userId);
      return;
    }

    const tweetId = await getExternalTweetId(postId);
    if (!tweetId) {
      console.warn("[x-sync] syncRetweetToX: ABORT - no external tweetId for post", postId);
      return;
    }

    console.log(`[x-sync] syncRetweetToX: CALLING Zernio. accountId=${accountId.slice(0, 15)}..., tweetId=${tweetId}, isRetweeting=${isRetweeting}`);
    const { retweetPost, undoRetweet } = await import("@/lib/zernio/client");
    if (isRetweeting) {
      await retweetPost(accountId, tweetId);
      console.log(`[x-sync] syncRetweetToX: SUCCESS - retweeted ${tweetId}`);
    } else {
      await undoRetweet(accountId, tweetId);
      console.log(`[x-sync] syncRetweetToX: SUCCESS - undid retweet ${tweetId}`);
    }
    console.log(`[x-sync] ===== syncRetweetToX END (success) =====`);
  } catch (err) {
    console.error("[x-sync] syncRetweetToX EXCEPTION:", err);
    console.log(`[x-sync] ===== syncRetweetToX END (error) =====`);
  }
};

const syncReplyToX = async (userId: string, postId: string, body: string) => {
  console.log(`[x-sync] ===== syncReplyToX START =====`);
  console.log(`[x-sync] syncReplyToX called with userId=${userId}, postId=${postId}, body="${body.slice(0, 50)}"`);
  try {
    const accountId = await getZernioAccountId(userId);
    if (!accountId) {
      console.warn("[x-sync] syncReplyToX: ABORT - no accountId for user", userId);
      return;
    }

    const tweetId = await getExternalTweetId(postId);
    if (!tweetId) {
      console.warn("[x-sync] syncReplyToX: ABORT - no external tweetId for post", postId);
      return;
    }

    console.log(`[x-sync] syncReplyToX: CALLING replyToTweet(accountId=${accountId.slice(0, 15)}..., tweetId=${tweetId}, body="${body.slice(0, 50)}")`);
    const { replyToTweet } = await import("@/lib/zernio/client");
    const result = await replyToTweet(accountId, tweetId, body);
    console.log(`[x-sync] syncReplyToX: SUCCESS - replied to tweet ${tweetId}, result=${JSON.stringify(result)}`);
    console.log(`[x-sync] ===== syncReplyToX END (success) =====`);
  } catch (err) {
    console.error("[x-sync] syncReplyToX EXCEPTION:", err);
    console.log(`[x-sync] ===== syncReplyToX END (error) =====`);
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
  revalidatePath("/");
  redirect(redirectTo);
};

export const disconnectDemoAccountAction = async (formData: FormData) => {
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  await clearViewerUserId();
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

  // Validate body
  const rawBody = String(formData.get("body") ?? "");
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be between 2 and 1000 characters.")}`;
    redirect(errorUrl);
  }
  const body = parsedBody.data;

  // Create post in local DB
  let newPostId: string | null = null;
  try {
    const nextSnapshot = await applyCreatePost({
      actorUserId: viewerUserId,
      communitySlug,
      body,
    });

    // Find the NEWEST post by this user (last in array = most recently created)
    const community = nextSnapshot.communities.find((c) => c.slug === communitySlug);
    if (community) {
      const userPostsInCommunity = nextSnapshot.posts.filter(
        (p) =>
          p.communityId === community.id &&
          p.authorUserId === viewerUserId,
      );
      const newPost = userPostsInCommunity[userPostsInCommunity.length - 1];
      newPostId = newPost?.id ?? null;
    }
  } catch (err) {
    console.error("[createPostAction] Failed to create post:", err);
    const message = err instanceof Error ? err.message : "Failed to create post.";
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(message)}`;
    redirect(errorUrl);
  }

  // ── X/Twitter sync via Zernio — must await before redirect ──
  if (newPostId) {
    console.log(`[x-sync] Publishing post ${newPostId} (body: "${body.slice(0, 30)}") to X`);
    try {
      await publishToX(viewerUserId, newPostId, body);
    } catch (err) {
      console.error("[x-sync] Publication failed:", err);
    }
  } else {
    console.warn("[x-sync] Could not find new post to publish");
  }

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

  const rawBody = String(formData.get("body") ?? "");
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Reply must be between 2 and 1000 characters.")}`;
    redirect(errorUrl);
  }
  const body = parsedBody.data;

  // Create reply in local DB
  let replyCreated = false;
  try {
    await applyCreateReply({
      actorUserId: viewerUserId,
      postId,
      body,
    });
    replyCreated = true;
  } catch (err) {
    console.error("[createReplyAction] Failed to create reply:", err);
  }

  // Sync reply to X — always attempt if reply was created locally
  if (replyCreated) {
    console.log(`[x-sync] createReplyAction: syncing reply to X. viewerUserId=${viewerUserId}, parentPostId=${postId}, body="${body.slice(0, 30)}"`);
    try {
      await syncReplyToX(viewerUserId, postId, body);
      console.log(`[x-sync] createReplyAction: syncReplyToX completed`);
    } catch (err) {
      console.error("[x-sync] createReplyAction: Reply sync FAILED:", err);
    }
  }

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

  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};
