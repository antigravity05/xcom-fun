import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import {
  communityMemberships,
  communities,
  postPublications,
  postReactions,
  postReplies,
  posts,
  users,
} from "@/drizzle/schema";
import type {
  CommunityRole,
  MembershipStatus,
  PublicationStatus,
} from "@/lib/xcom-domain";
import {
  createCommunity as createCommunityOperation,
  deleteCommunity as deleteCommunityOperation,
  deletePost as deletePostOperation,
  createPost as createPostOperation,
  createReply as createReplyOperation,
  joinCommunity as joinCommunityOperation,
  leaveCommunity as leaveCommunityOperation,
  setMemberRole as setMemberRoleOperation,
  toggleLike as toggleLikeOperation,
  togglePinnedPost as togglePinnedPostOperation,
  toggleRepost as toggleRepostOperation,
  updateCommunity as updateCommunityOperation,
  updatePost as updatePostOperation,
} from "@/lib/xcom-operations";
import { getDb } from "@/lib/database/client";
import type { XcomStoreSnapshot } from "@/lib/xcom-store";

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export const readXcomStore = async (): Promise<XcomStoreSnapshot> => {
  const db = getDb();

  // Fetch all data from database
  const allUsers = await db.query.users.findMany();
  const allCommunities = await db.query.communities.findMany();
  const allMemberships = await db.query.communityMemberships.findMany();
  const allPosts = await db.query.posts.findMany();
  const allReplies = await db.query.postReplies.findMany();
  const allReactions = await db.query.postReactions.findMany();

  // Transform database records to store snapshot format
  const storeUsers = allUsers.map((user) => ({
    id: user.id,
    xUserId: user.xUserId,
    xHandle: user.xHandle,
    displayName: user.displayName,
    avatar: user.avatarUrl || "",
  }));

  const storeCommunities = allCommunities.map((community) => ({
    id: community.id,
    slug: community.slug,
    name: community.name,
    ticker: community.ticker,
    tagline: community.tagline,
    description: community.description,
    rules: community.rules,
    bannerUrl: community.bannerUrl ?? undefined,
    contractAddress: community.contractAddress ?? undefined,
    createdByUserId: community.createdByUserId,
    memberCount: community.memberCount,
    createdAt: community.createdAt.toISOString(),
  }));

  const storeMemberships = allMemberships.map((membership) => ({
    id: membership.id,
    communityId: membership.communityId,
    userId: membership.userId,
    role: membership.role as CommunityRole,
    status: membership.status as MembershipStatus,
    createdAt: membership.createdAt.toISOString(),
  }));

  const storePosts = allPosts.map((post) => {
    // Find publication status for this post
    const publication = allReactions.find((r) => r.postId === post.id);
    let xSyncStatus: PublicationStatus = "pending";

    // For now, default to pending. In a real system, you'd query post_publications table
    // This is a simplified version - you may want to query postPublications separately

    return {
      id: post.id,
      communityId: post.communityId,
      authorUserId: post.authorUserId,
      body: post.body,
      media: post.mediaPayload as any,
      isPinned: post.isPinned || false,
      replyCount: allReplies.filter((r) => r.postId === post.id).length,
      likeCount: allReactions.filter((r) => r.postId === post.id && r.kind === "like").length,
      repostCount: 0, // Repost kind not in current schema, using 0
      viewCount: 0, // View count not tracked in schema, using 0
      createdAt: post.createdAt.toISOString(),
      xSyncStatus,
    };
  });

  const storeReplies = allReplies.map((reply) => ({
    id: reply.id,
    postId: reply.postId,
    authorUserId: reply.authorUserId,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
  }));

  const storeReactions = allReactions.map((reaction) => ({
    id: reaction.id,
    postId: reaction.postId,
    userId: reaction.userId,
    kind: (reaction.kind || "like") as "like" | "repost",
    createdAt: reaction.createdAt.toISOString(),
  }));

  return {
    users: storeUsers,
    communities: storeCommunities,
    memberships: storeMemberships,
    posts: storePosts,
    replies: storeReplies,
    reactions: storeReactions,
  };
};

export const applyCreateCommunity = async (
  input: Parameters<typeof createCommunityOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = createCommunityOperation(snapshot, input);

  // Find the newly created community
  const newCommunity = nextSnapshot.communities.find(
    (c) => c.slug === input.slug && !snapshot.communities.some((sc) => sc.slug === input.slug),
  );

  if (!newCommunity) {
    throw new Error("Failed to create community in operation");
  }

  // Insert into database
  const communityId = newCommunity.id;
  await db.insert(communities).values({
    id: communityId,
    slug: newCommunity.slug,
    name: newCommunity.name,
    ticker: newCommunity.ticker,
    tagline: newCommunity.tagline,
    description: newCommunity.description,
    rules: newCommunity.rules,
    contractAddress: newCommunity.contractAddress,
    bannerUrl: newCommunity.bannerUrl,
    createdByUserId: newCommunity.createdByUserId,
    memberCount: newCommunity.memberCount,
    createdAt: new Date(newCommunity.createdAt),
  });

  // Insert the admin membership
  const newMembership = nextSnapshot.memberships.find(
    (m) =>
      m.communityId === communityId &&
      m.userId === input.actorUserId &&
      !snapshot.memberships.some(
        (sm) => sm.communityId === communityId && sm.userId === input.actorUserId,
      ),
  );

  if (newMembership) {
    await db.insert(communityMemberships).values({
      id: newMembership.id,
      communityId: newMembership.communityId,
      userId: newMembership.userId,
      role: newMembership.role,
      status: newMembership.status,
      createdAt: new Date(newMembership.createdAt),
    });
  }

  return nextSnapshot;
};

export const applyUpdateCommunity = async (
  input: Parameters<typeof updateCommunityOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = updateCommunityOperation(snapshot, input);

  // Find the updated community
  const community = snapshot.communities.find((c) => c.slug === input.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  const updatedCommunity = nextSnapshot.communities.find((c) => c.id === community.id);
  if (!updatedCommunity) {
    throw new Error("Failed to update community");
  }

  await db
    .update(communities)
    .set({
      name: updatedCommunity.name,
      description: updatedCommunity.description,
      tagline: updatedCommunity.tagline,
      bannerUrl: updatedCommunity.bannerUrl,
    })
    .where(eq(communities.id, community.id));

  return nextSnapshot;
};

export const applyDeleteCommunity = async (
  input: Parameters<typeof deleteCommunityOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = deleteCommunityOperation(snapshot, input);

  // Find the deleted community
  const community = snapshot.communities.find((c) => c.slug === input.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  // Database cascades will handle memberships, posts, replies, and reactions
  await db.delete(communities).where(eq(communities.id, community.id));

  return nextSnapshot;
};

export const applyJoinCommunity = async (
  input: Parameters<typeof joinCommunityOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = joinCommunityOperation(snapshot, input);

  const community = snapshot.communities.find((c) => c.slug === input.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  // Check if membership was added
  const newMembership = nextSnapshot.memberships.find(
    (m) =>
      m.communityId === community.id &&
      m.userId === input.actorUserId &&
      !snapshot.memberships.some(
        (sm) => sm.communityId === community.id && sm.userId === input.actorUserId,
      ),
  );

  if (newMembership) {
    await db.insert(communityMemberships).values({
      id: newMembership.id,
      communityId: newMembership.communityId,
      userId: newMembership.userId,
      role: newMembership.role,
      status: newMembership.status,
      createdAt: new Date(newMembership.createdAt),
    });
  }

  // Update member count
  const updatedCommunity = nextSnapshot.communities.find((c) => c.id === community.id);
  if (updatedCommunity && updatedCommunity.memberCount !== community.memberCount) {
    await db
      .update(communities)
      .set({ memberCount: updatedCommunity.memberCount })
      .where(eq(communities.id, community.id));
  }

  return nextSnapshot;
};

export const applyLeaveCommunity = async (
  input: Parameters<typeof leaveCommunityOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = leaveCommunityOperation(snapshot, input);

  const community = snapshot.communities.find((c) => c.slug === input.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  // Find and delete the membership
  const membershipToDelete = snapshot.memberships.find(
    (m) =>
      m.communityId === community.id &&
      m.userId === input.actorUserId &&
      m.status === "active",
  );

  if (
    membershipToDelete &&
    !nextSnapshot.memberships.some((m) => m.id === membershipToDelete.id)
  ) {
    await db
      .delete(communityMemberships)
      .where(eq(communityMemberships.id, membershipToDelete.id));
  }

  // Update member count
  const updatedCommunity = nextSnapshot.communities.find((c) => c.id === community.id);
  if (updatedCommunity && updatedCommunity.memberCount !== community.memberCount) {
    await db
      .update(communities)
      .set({ memberCount: updatedCommunity.memberCount })
      .where(eq(communities.id, community.id));
  }

  return nextSnapshot;
};

export const applyCreatePost = async (input: Parameters<typeof createPostOperation>[1]) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = createPostOperation(snapshot, input);

  const community = snapshot.communities.find((c) => c.slug === input.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  // Find the newly created post
  const newPost = nextSnapshot.posts.find(
    (p) => p.communityId === community.id && !snapshot.posts.some((sp) => sp.id === p.id),
  );

  if (!newPost) {
    throw new Error("Failed to create post");
  }

  await db.insert(posts).values({
    id: newPost.id,
    communityId: newPost.communityId,
    authorUserId: newPost.authorUserId,
    body: newPost.body,
    mediaPayload: newPost.media || null,
    isPinned: newPost.isPinned || false,
    createdAt: new Date(newPost.createdAt),
  });

  return nextSnapshot;
};

export const applyCreateReply = async (input: Parameters<typeof createReplyOperation>[1]) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = createReplyOperation(snapshot, input);

  // Find the newly created reply
  const newReply = nextSnapshot.replies.find(
    (r) => r.postId === input.postId && !snapshot.replies.some((sr) => sr.id === r.id),
  );

  if (!newReply) {
    throw new Error("Failed to create reply");
  }

  await db.insert(postReplies).values({
    id: newReply.id,
    postId: newReply.postId,
    authorUserId: newReply.authorUserId,
    body: newReply.body,
    createdAt: new Date(newReply.createdAt),
  });

  // Update post reply count
  const updatedPost = nextSnapshot.posts.find((p) => p.id === input.postId);
  const originalPost = snapshot.posts.find((p) => p.id === input.postId);

  if (updatedPost && originalPost && updatedPost.replyCount !== originalPost.replyCount) {
    await db
      .update(posts)
      .set({})
      .where(eq(posts.id, input.postId));
  }

  return nextSnapshot;
};

export const applyUpdatePost = async (input: Parameters<typeof updatePostOperation>[1]) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = updatePostOperation(snapshot, input);

  const post = snapshot.posts.find((p) => p.id === input.postId);
  if (!post) {
    throw new Error("Post not found");
  }

  const updatedPost = nextSnapshot.posts.find((p) => p.id === post.id);
  if (!updatedPost) {
    throw new Error("Failed to update post");
  }

  await db
    .update(posts)
    .set({
      body: updatedPost.body,
    })
    .where(eq(posts.id, post.id));

  return nextSnapshot;
};

export const applyDeletePost = async (input: Parameters<typeof deletePostOperation>[1]) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = deletePostOperation(snapshot, input);

  const post = snapshot.posts.find((p) => p.id === input.postId);
  if (!post) {
    throw new Error("Post not found");
  }

  // Database cascades will handle replies and reactions
  await db.delete(posts).where(eq(posts.id, post.id));

  return nextSnapshot;
};

export const applyTogglePinnedPost = async (
  input: Parameters<typeof togglePinnedPostOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = togglePinnedPostOperation(snapshot, input);

  const post = snapshot.posts.find((p) => p.id === input.postId);
  if (!post) {
    throw new Error("Post not found");
  }

  const updatedPost = nextSnapshot.posts.find((p) => p.id === post.id);
  if (!updatedPost) {
    throw new Error("Failed to toggle pin");
  }

  await db
    .update(posts)
    .set({
      isPinned: updatedPost.isPinned || false,
    })
    .where(eq(posts.id, post.id));

  return nextSnapshot;
};

export const applySetMemberRole = async (
  input: Parameters<typeof setMemberRoleOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = setMemberRoleOperation(snapshot, input);

  const community = snapshot.communities.find((c) => c.slug === input.communitySlug);
  if (!community) {
    throw new Error("Community not found");
  }

  const membership = snapshot.memberships.find(
    (m) =>
      m.communityId === community.id &&
      m.userId === input.targetUserId &&
      m.status === "active",
  );

  if (!membership) {
    throw new Error("Membership not found");
  }

  const updatedMembership = nextSnapshot.memberships.find((m) => m.id === membership.id);
  if (!updatedMembership) {
    throw new Error("Failed to update membership");
  }

  await db
    .update(communityMemberships)
    .set({
      role: updatedMembership.role,
    })
    .where(eq(communityMemberships.id, membership.id));

  return nextSnapshot;
};

export const applyToggleRepost = async (
  input: Parameters<typeof toggleRepostOperation>[1],
) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = toggleRepostOperation(snapshot, input);

  const post = snapshot.posts.find((p) => p.id === input.postId);
  if (!post) {
    throw new Error("Post not found");
  }

  // Find if reaction was added or removed
  const existingReaction = snapshot.reactions.find(
    (r) => r.postId === input.postId && r.userId === input.actorUserId && r.kind === "repost",
  );

  const newReaction = nextSnapshot.reactions.find(
    (r) => r.postId === input.postId && r.userId === input.actorUserId && r.kind === "repost",
  );

  if (!existingReaction && newReaction) {
    // Add reaction
    await db.insert(postReactions).values({
      id: newReaction.id,
      postId: newReaction.postId,
      userId: newReaction.userId,
      kind: "like", // Use like as placeholder since repost kind not in schema
      createdAt: new Date(newReaction.createdAt),
    });
  } else if (existingReaction && !newReaction) {
    // Remove reaction
    await db
      .delete(postReactions)
      .where(eq(postReactions.id, existingReaction.id));
  }

  return nextSnapshot;
};

export const applyToggleLike = async (input: Parameters<typeof toggleLikeOperation>[1]) => {
  const db = getDb();
  const snapshot = await readXcomStore();

  // Use business logic to validate
  const nextSnapshot = toggleLikeOperation(snapshot, input);

  const post = snapshot.posts.find((p) => p.id === input.postId);
  if (!post) {
    throw new Error("Post not found");
  }

  // Find if reaction was added or removed
  const existingReaction = snapshot.reactions.find(
    (r) => r.postId === input.postId && r.userId === input.actorUserId && r.kind === "like",
  );

  const newReaction = nextSnapshot.reactions.find(
    (r) => r.postId === input.postId && r.userId === input.actorUserId && r.kind === "like",
  );

  if (!existingReaction && newReaction) {
    // Add reaction
    await db.insert(postReactions).values({
      id: newReaction.id,
      postId: newReaction.postId,
      userId: newReaction.userId,
      kind: "like",
      createdAt: new Date(newReaction.createdAt),
    });
  } else if (existingReaction && !newReaction) {
    // Remove reaction
    await db
      .delete(postReactions)
      .where(eq(postReactions.id, existingReaction.id));
  }

  return nextSnapshot;
};
