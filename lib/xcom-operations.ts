import type { XcomStoreSnapshot } from "@/lib/xcom-store";

type CreateCommunityInput = {
  actorUserId: string;
  slug: string;
  name: string;
  ticker: string;
  tagline: string;
  description: string;
  rules: string[];
  bannerUrl?: string;
  contractAddress?: string;
};

type UpdateCommunityInput = {
  actorUserId: string;
  communitySlug: string;
  name: string;
  description: string;
  bannerUrl?: string;
};

type JoinCommunityInput = {
  actorUserId: string;
  communitySlug: string;
};

type LeaveCommunityInput = {
  actorUserId: string;
  communitySlug: string;
};

type DeleteCommunityInput = {
  actorUserId: string;
  communitySlug: string;
};

type CreatePostInput = {
  actorUserId: string;
  communitySlug: string;
  body: string;
  media?: import("./xcom-domain").CommunityPostMedia;
};

type CreateReplyInput = {
  actorUserId: string;
  postId: string;
  body: string;
};

type UpdatePostInput = {
  actorUserId?: string;
  postId: string;
  body?: string;
  updates?: {
    body?: string;
    xSyncStatus?: "draft" | "pending" | "published" | "failed";
  };
};

type DeletePostInput = {
  actorUserId: string;
  postId: string;
};

type TogglePinnedPostInput = {
  actorUserId: string;
  postId: string;
};

type ToggleRepostInput = {
  actorUserId: string;
  postId: string;
};

type SetMemberRoleInput = {
  actorUserId: string;
  communitySlug: string;
  targetUserId: string;
  role: "member" | "moderator";
};

type ToggleLikeInput = {
  actorUserId: string;
  postId: string;
};

const createId = () => crypto.randomUUID();

const now = () => new Date().toISOString();

const cloneState = (state: XcomStoreSnapshot): XcomStoreSnapshot => {
  return {
    users: [...state.users],
    communities: [...state.communities],
    memberships: [...state.memberships],
    posts: [...state.posts],
    replies: [...state.replies],
    reactions: [...state.reactions],
  };
};

const assertUserExists = (state: XcomStoreSnapshot, userId: string) => {
  const user = state.users.find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Actor user does not exist.");
  }

  return user;
};

const getCommunityBySlug = (state: XcomStoreSnapshot, slug: string) => {
  const community = state.communities.find((entry) => entry.slug === slug);

  if (!community) {
    throw new Error("Community not found.");
  }

  return community;
};

const assertCommunityAdmin = (
  state: XcomStoreSnapshot,
  communityId: string,
  userId: string,
) => {
  const membership = assertActiveMembership(state, communityId, userId);

  if (membership.role !== "admin") {
    throw new Error("Only admins can manage this community.");
  }

  return membership;
};

const countActiveAdmins = (state: XcomStoreSnapshot, communityId: string) => {
  return state.memberships.filter(
    (entry) =>
      entry.communityId === communityId &&
      entry.status === "active" &&
      entry.role === "admin",
  ).length;
};

const assertActiveMembership = (
  state: XcomStoreSnapshot,
  communityId: string,
  userId: string,
) => {
  const membership = state.memberships.find(
    (entry) =>
      entry.communityId === communityId &&
      entry.userId === userId &&
      entry.status === "active",
  );

  if (!membership) {
    throw new Error("Active membership required.");
  }

  return membership;
};

const getPostById = (state: XcomStoreSnapshot, postId: string) => {
  const post = state.posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new Error("Post not found.");
  }

  return post;
};

const assertCanEditPost = (
  state: XcomStoreSnapshot,
  postId: string,
  userId: string,
) => {
  const post = getPostById(state, postId);

  if (post.authorUserId !== userId) {
    throw new Error("Only the author can edit this post.");
  }

  assertActiveMembership(state, post.communityId, userId);

  return post;
};

const assertCanDeletePost = (
  state: XcomStoreSnapshot,
  postId: string,
  userId: string,
) => {
  const post = getPostById(state, postId);

  if (post.authorUserId === userId) {
    assertActiveMembership(state, post.communityId, userId);
    return post;
  }

  const membership = assertActiveMembership(state, post.communityId, userId);

  if (membership.role !== "admin" && membership.role !== "moderator") {
    throw new Error("Only the author or a moderator can delete this post.");
  }

  return post;
};

const assertCanTogglePinnedPost = (
  state: XcomStoreSnapshot,
  postId: string,
  userId: string,
) => {
  const post = getPostById(state, postId);
  const membership = assertActiveMembership(state, post.communityId, userId);

  if (membership.role !== "admin" && membership.role !== "moderator") {
    throw new Error("Only admins or moderators can manage pinned posts.");
  }

  return post;
};

const assertCanDeleteCommunity = (
  state: XcomStoreSnapshot,
  communitySlug: string,
  userId: string,
) => {
  const community = getCommunityBySlug(state, communitySlug);
  assertCommunityAdmin(state, community.id, userId);

  return community;
};

export const createCommunity = (
  state: XcomStoreSnapshot,
  input: CreateCommunityInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);

  if (state.communities.some((entry) => entry.slug === input.slug)) {
    throw new Error("Community slug already exists.");
  }

  const nextState = cloneState(state);
  const communityId = createId();
  const createdAt = now();

  nextState.communities.push({
    id: communityId,
    slug: input.slug,
    name: input.name,
    ticker: input.ticker.startsWith("$") ? input.ticker : `$${input.ticker}`,
    tagline: input.tagline,
    description: input.description,
    rules: input.rules,
    bannerUrl: input.bannerUrl,
    contractAddress: input.contractAddress,
    createdByUserId: input.actorUserId,
    memberCount: 1,
    createdAt,
  });

  nextState.memberships.push({
    id: createId(),
    communityId,
    userId: input.actorUserId,
    role: "admin",
    status: "active",
    createdAt,
  });

  return nextState;
};

export const updateCommunity = (
  state: XcomStoreSnapshot,
  input: UpdateCommunityInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);

  const community = getCommunityBySlug(state, input.communitySlug);
  assertCommunityAdmin(state, community.id, input.actorUserId);

  const nextState = cloneState(state);
  const communityIndex = nextState.communities.findIndex(
    (entry) => entry.id === community.id,
  );

  if (communityIndex >= 0) {
    nextState.communities[communityIndex] = {
      ...nextState.communities[communityIndex],
      name: input.name,
      description: input.description,
      tagline: input.description.trim().slice(0, 90),
      bannerUrl:
        input.bannerUrl ?? nextState.communities[communityIndex].bannerUrl,
    };
  }

  return nextState;
};

export const joinCommunity = (
  state: XcomStoreSnapshot,
  input: JoinCommunityInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);

  const community = getCommunityBySlug(state, input.communitySlug);
  const existingMembership = state.memberships.find(
    (entry) =>
      entry.communityId === community.id &&
      entry.userId === input.actorUserId &&
      entry.status === "active",
  );

  if (existingMembership) {
    return cloneState(state);
  }

  const nextState = cloneState(state);
  const communityIndex = nextState.communities.findIndex(
    (entry) => entry.id === community.id,
  );

  nextState.memberships.push({
    id: createId(),
    communityId: community.id,
    userId: input.actorUserId,
    role: "member",
    status: "active",
    createdAt: now(),
  });

  if (communityIndex >= 0) {
    nextState.communities[communityIndex] = {
      ...nextState.communities[communityIndex],
      memberCount: nextState.communities[communityIndex].memberCount + 1,
    };
  }

  return nextState;
};

export const leaveCommunity = (
  state: XcomStoreSnapshot,
  input: LeaveCommunityInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);

  const community = getCommunityBySlug(state, input.communitySlug);
  const membership = state.memberships.find(
    (entry) =>
      entry.communityId === community.id &&
      entry.userId === input.actorUserId &&
      entry.status === "active",
  );

  if (!membership) {
    return cloneState(state);
  }

  if (
    membership.role === "admin" &&
    countActiveAdmins(state, community.id) <= 1
  ) {
    throw new Error("The last active admin cannot leave the community.");
  }

  const nextState = cloneState(state);
  const communityIndex = nextState.communities.findIndex(
    (entry) => entry.id === community.id,
  );

  nextState.memberships = nextState.memberships.filter(
    (entry) =>
      !(
        entry.communityId === community.id &&
        entry.userId === input.actorUserId &&
        entry.status === "active"
      ),
  );

  if (communityIndex >= 0) {
    nextState.communities[communityIndex] = {
      ...nextState.communities[communityIndex],
      memberCount: Math.max(nextState.communities[communityIndex].memberCount - 1, 0),
    };
  }

  return nextState;
};

export const deleteCommunity = (
  state: XcomStoreSnapshot,
  input: DeleteCommunityInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  const community = assertCanDeleteCommunity(
    state,
    input.communitySlug,
    input.actorUserId,
  );

  const nextState = cloneState(state);
  const communityPostIds = new Set(
    nextState.posts
      .filter((entry) => entry.communityId === community.id)
      .map((entry) => entry.id),
  );

  nextState.communities = nextState.communities.filter(
    (entry) => entry.id !== community.id,
  );
  nextState.memberships = nextState.memberships.filter(
    (entry) => entry.communityId !== community.id,
  );
  nextState.posts = nextState.posts.filter(
    (entry) => entry.communityId !== community.id,
  );
  nextState.replies = nextState.replies.filter(
    (entry) => !communityPostIds.has(entry.postId),
  );
  nextState.reactions = nextState.reactions.filter(
    (entry) => !communityPostIds.has(entry.postId),
  );

  return nextState;
};

export const createPost = (
  state: XcomStoreSnapshot,
  input: CreatePostInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  const community = getCommunityBySlug(state, input.communitySlug);
  assertActiveMembership(state, community.id, input.actorUserId);

  const nextState = cloneState(state);
  nextState.posts.unshift({
    id: createId(),
    communityId: community.id,
    authorUserId: input.actorUserId,
    body: input.body,
    media: input.media,
    replyCount: 0,
    likeCount: 0,
    repostCount: 0,
    viewCount: 1,
    createdAt: now(),
    xSyncStatus: "pending",
  });

  return nextState;
};

export const createReply = (
  state: XcomStoreSnapshot,
  input: CreateReplyInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  const post = getPostById(state, input.postId);

  assertActiveMembership(state, post.communityId, input.actorUserId);

  const nextState = cloneState(state);
  const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);

  nextState.replies.push({
    id: createId(),
    postId: input.postId,
    authorUserId: input.actorUserId,
    body: input.body,
    createdAt: now(),
  });

  if (postIndex >= 0) {
    nextState.posts[postIndex] = {
      ...nextState.posts[postIndex],
      replyCount: nextState.posts[postIndex].replyCount + 1,
    };
  }

  return nextState;
};

export const updatePost = (
  state: XcomStoreSnapshot,
  input: UpdatePostInput,
): XcomStoreSnapshot => {
  if (input.actorUserId) {
    assertUserExists(state, input.actorUserId);
    assertCanEditPost(state, input.postId, input.actorUserId);
  }

  const nextState = cloneState(state);
  const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);

  if (postIndex >= 0) {
    const updateData: Partial<(typeof nextState.posts)[number]> = {};

    if (input.body !== undefined) {
      updateData.body = input.body;
      updateData.xSyncStatus = "pending";
    } else if (input.updates?.body !== undefined) {
      updateData.body = input.updates.body;
      updateData.xSyncStatus = "pending";
    }

    if (input.updates?.xSyncStatus !== undefined) {
      updateData.xSyncStatus = input.updates.xSyncStatus;
    }

    nextState.posts[postIndex] = {
      ...nextState.posts[postIndex],
      ...updateData,
    };
  }

  return nextState;
};

export const deletePost = (
  state: XcomStoreSnapshot,
  input: DeletePostInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  assertCanDeletePost(state, input.postId, input.actorUserId);

  const nextState = cloneState(state);

  nextState.posts = nextState.posts.filter((entry) => entry.id !== input.postId);
  nextState.replies = nextState.replies.filter((entry) => entry.postId !== input.postId);
  nextState.reactions = nextState.reactions.filter((entry) => entry.postId !== input.postId);

  return nextState;
};

export const togglePinnedPost = (
  state: XcomStoreSnapshot,
  input: TogglePinnedPostInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  assertCanTogglePinnedPost(state, input.postId, input.actorUserId);

  const nextState = cloneState(state);
  const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);

  if (postIndex >= 0) {
    nextState.posts[postIndex] = {
      ...nextState.posts[postIndex],
      isPinned: !Boolean(nextState.posts[postIndex].isPinned),
    };
  }

  return nextState;
};

export const setMemberRole = (
  state: XcomStoreSnapshot,
  input: SetMemberRoleInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  assertUserExists(state, input.targetUserId);

  const community = getCommunityBySlug(state, input.communitySlug);
  assertCommunityAdmin(state, community.id, input.actorUserId);

  if (input.targetUserId === input.actorUserId) {
    throw new Error("Admins cannot change their own role from this action.");
  }

  const nextState = cloneState(state);
  const membershipIndex = nextState.memberships.findIndex(
    (entry) =>
      entry.communityId === community.id &&
      entry.userId === input.targetUserId &&
      entry.status === "active",
  );

  if (membershipIndex < 0) {
    throw new Error("Target member not found.");
  }

  if (nextState.memberships[membershipIndex]?.role === "admin") {
    throw new Error("Admin roles cannot be changed from this action.");
  }

  nextState.memberships[membershipIndex] = {
    ...nextState.memberships[membershipIndex],
    role: input.role,
  };

  return nextState;
};

export const toggleRepost = (
  state: XcomStoreSnapshot,
  input: ToggleRepostInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  const post = getPostById(state, input.postId);

  assertActiveMembership(state, post.communityId, input.actorUserId);

  const nextState = cloneState(state);
  const existingReactionIndex = nextState.reactions.findIndex(
    (entry) =>
      entry.postId === input.postId &&
      entry.userId === input.actorUserId &&
      entry.kind === "repost",
  );

  if (existingReactionIndex >= 0) {
    nextState.reactions.splice(existingReactionIndex, 1);

    const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);
    if (postIndex >= 0) {
      nextState.posts[postIndex] = {
        ...nextState.posts[postIndex],
        repostCount: Math.max(nextState.posts[postIndex].repostCount - 1, 0),
      };
    }

    return nextState;
  }

  nextState.reactions.push({
    id: createId(),
    postId: input.postId,
    userId: input.actorUserId,
    kind: "repost",
    xSyncStatus: "pending",
    createdAt: now(),
  });

  const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);
  if (postIndex >= 0) {
    nextState.posts[postIndex] = {
      ...nextState.posts[postIndex],
      repostCount: nextState.posts[postIndex].repostCount + 1,
    };
  }

  return nextState;
};

export const toggleLike = (
  state: XcomStoreSnapshot,
  input: ToggleLikeInput,
): XcomStoreSnapshot => {
  assertUserExists(state, input.actorUserId);
  const post = getPostById(state, input.postId);

  assertActiveMembership(state, post.communityId, input.actorUserId);

  const nextState = cloneState(state);
  const existingReactionIndex = nextState.reactions.findIndex(
    (entry) =>
      entry.postId === input.postId &&
      entry.userId === input.actorUserId &&
      entry.kind === "like",
  );

  if (existingReactionIndex >= 0) {
    nextState.reactions.splice(existingReactionIndex, 1);

    const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);
    if (postIndex >= 0) {
      nextState.posts[postIndex] = {
        ...nextState.posts[postIndex],
        likeCount: Math.max(nextState.posts[postIndex].likeCount - 1, 0),
      };
    }

    return nextState;
  }

  nextState.reactions.push({
    id: createId(),
    postId: input.postId,
    userId: input.actorUserId,
    kind: "like",
    createdAt: now(),
  });

  const postIndex = nextState.posts.findIndex((entry) => entry.id === input.postId);
  if (postIndex >= 0) {
    nextState.posts[postIndex] = {
      ...nextState.posts[postIndex],
      likeCount: nextState.posts[postIndex].likeCount + 1,
    };
  }

  return nextState;
};
