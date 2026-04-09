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

    // Record the publication attempt in the DB
    try {
      const db = getDb();
      await db.insert(postPublications).values({
        postId,
        provider: "x",
        status: result.status === "published" ? "published" : "failed",
        externalPostId: result.externalPostId ?? null,
        lastError: result.errorMessage ?? null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      });
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

  // Validate body — Zod throws on invalid input, so we catch it
  let body: string;
  try {
    body = bodySchema.parse(String(formData.get("body") ?? ""));
  } catch {
    // Body too short or too long — redirect back with error
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent("Post must be between 2 and 1000 characters.")}`;
    redirect(errorUrl);
    return; // unreachable, but keeps TS happy
  }

  try {
    await applyCreatePost({
      actorUserId: viewerUserId,
      communitySlug,
      body,
    });
  } catch (err) {
    console.error("[createPostAction] Failed to create post:", err);
    const message = err instanceof Error ? err.message : "Failed to create post.";
    const errorUrl = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}post_error=${encodeURIComponent(message)}`;
    redirect(errorUrl);
    return;
  }

  // ── X/Twitter sync: DISABLED until X API Basic plan ($100/mo) is activated ──
  // Uncomment the block below once you have a paid X API plan.
  // const community = nextSnapshot.communities.find((c) => c.slug === communitySlug);
  // if (community) {
  //   const newPost = nextSnapshot.posts.find(
  //     (p) =>
  //       p.communityId === community.id &&
  //       p.authorUserId === viewerUserId &&
  //       !previousSnapshot.posts.some((sp) => sp.id === p.id),
  //   );
  //   if (newPost) {
  //     try {
  //       await publishToX(viewerUserId, newPost.id, body);
  //     } catch (err) {
  //       console.error("[x-sync] Publication failed:", err);
  //     }
  //   }
  // }

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

  revalidatePath(`/communities/${communitySlug}`);
  redirect(redirectTo);
};
