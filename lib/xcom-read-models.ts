import "server-only";

import type {
  CommunityMemberRecord,
  CommunityPostRecord,
  CommunityReplyRecord,
  CommunityRecord,
  CommunityRole,
  MembershipStatus,
} from "@/lib/xcom-domain";
import { getViewerUserId } from "@/lib/xcom-session";
import { cachedReadXcomStore as readXcomStore } from "@/lib/xcom-persistence";
import type {
  XcomStoreSnapshot,
  XcomStoreUser,
  XcomStoreMembership,
  XcomStoreReaction,
  XcomStoreReply,
} from "@/lib/xcom-store";

type CommunityVisualProfile = {
  avatar: string;
  accentColor: string;
  coverFrom: string;
  coverTo: string;
};

const communityVisualProfiles: Record<string, CommunityVisualProfile> = {};

/**
 * Slug → thumbnail URL overrides. Used to pin a bespoke logo on our own
 * community (and any partner communities) without touching DB records.
 * Takes precedence over whatever's stored on the community row.
 */
const communityThumbnailOverrides: Record<string, string> = {
  "x-fun-com-community": "/xcom-community-thumb.svg",
};

const defaultVisualProfile = (name: string): CommunityVisualProfile => {
  return {
    avatar: name
      .split(" ")
      .slice(0, 2)
      .map((part) => part.slice(0, 1).toUpperCase())
      .join(""),
    accentColor: "#52a9ff",
    coverFrom: "#14233c",
    coverTo: "#21406b",
  };
};

const communitySort = (left: CommunityRecord, right: CommunityRecord) => {
  if (right.memberCount !== left.memberCount) {
    return right.memberCount - left.memberCount;
  }

  return left.name.localeCompare(right.name);
};

const getCommunityVisualProfile = (slug: string, name: string) => {
  return communityVisualProfiles[slug] ?? defaultVisualProfile(name);
};

const toMemberIdentity = (
  user: XcomStoreUser,
  role?: CommunityRole,
  verified?: boolean,
) => {
  return {
    displayName: user.displayName,
    handle: user.xHandle,
    avatar: user.avatar,
    role,
    verified,
  };
};

const verifiedHandles = new Set<string>();
const membershipRoleOrder: Record<CommunityRole, number> = {
  admin: 0,
  moderator: 1,
  member: 2,
};

// ── Snapshot index helpers ──────────────────────────────────

type SnapshotIndex = {
  usersById: Map<string, XcomStoreUser>;
  communitiesById: Map<string, XcomStoreSnapshot["communities"][number]>;
  communitiesBySlug: Map<string, XcomStoreSnapshot["communities"][number]>;
  /** key = `${communityId}:${userId}` */
  membershipByCommunityUser: Map<string, XcomStoreMembership>;
  /** key = userId */
  membershipsByUser: Map<string, XcomStoreMembership[]>;
  /** key = communityId */
  membershipsByCommunity: Map<string, XcomStoreMembership[]>;
  /** key = postId */
  repliesByPost: Map<string, XcomStoreReply[]>;
  /** key = `${postId}:${userId}:${kind}` */
  reactionByPostUserKind: Map<string, XcomStoreReaction>;
  /** key = postId */
  postsByIdMap: Map<string, XcomStoreSnapshot["posts"][number]>;
  /** key = communityId */
  postsByCommunity: Map<string, XcomStoreSnapshot["posts"][number][]>;
};

const buildIndex = (snapshot: XcomStoreSnapshot): SnapshotIndex => {
  const usersById = new Map<string, XcomStoreUser>();
  for (const user of snapshot.users) {
    usersById.set(user.id, user);
  }

  const communitiesById = new Map<string, XcomStoreSnapshot["communities"][number]>();
  const communitiesBySlug = new Map<string, XcomStoreSnapshot["communities"][number]>();
  for (const community of snapshot.communities) {
    communitiesById.set(community.id, community);
    communitiesBySlug.set(community.slug, community);
  }

  const membershipByCommunityUser = new Map<string, XcomStoreMembership>();
  const membershipsByUser = new Map<string, XcomStoreMembership[]>();
  const membershipsByCommunity = new Map<string, XcomStoreMembership[]>();
  for (const membership of snapshot.memberships) {
    membershipByCommunityUser.set(
      `${membership.communityId}:${membership.userId}`,
      membership,
    );
    const userList = membershipsByUser.get(membership.userId) ?? [];
    userList.push(membership);
    membershipsByUser.set(membership.userId, userList);

    const communityList = membershipsByCommunity.get(membership.communityId) ?? [];
    communityList.push(membership);
    membershipsByCommunity.set(membership.communityId, communityList);
  }

  const repliesByPost = new Map<string, XcomStoreReply[]>();
  for (const reply of snapshot.replies) {
    const list = repliesByPost.get(reply.postId) ?? [];
    list.push(reply);
    repliesByPost.set(reply.postId, list);
  }

  const reactionByPostUserKind = new Map<string, XcomStoreReaction>();
  for (const reaction of snapshot.reactions) {
    reactionByPostUserKind.set(
      `${reaction.postId}:${reaction.userId}:${reaction.kind}`,
      reaction,
    );
  }

  const postsByIdMap = new Map<string, XcomStoreSnapshot["posts"][number]>();
  const postsByCommunity = new Map<string, XcomStoreSnapshot["posts"][number][]>();
  for (const post of snapshot.posts) {
    postsByIdMap.set(post.id, post);
    const list = postsByCommunity.get(post.communityId) ?? [];
    list.push(post);
    postsByCommunity.set(post.communityId, list);
  }

  return {
    usersById,
    communitiesById,
    communitiesBySlug,
    membershipByCommunityUser,
    membershipsByUser,
    membershipsByCommunity,
    repliesByPost,
    reactionByPostUserKind,
    postsByIdMap,
    postsByCommunity,
  };
};

// ── Snapshot cache (index is rebuilt per snapshot) ───────────

let cachedSnapshotRef: WeakRef<XcomStoreSnapshot> | null = null;
let cachedIndex: SnapshotIndex | null = null;

const getIndexedSnapshot = async () => {
  const snapshot = await readXcomStore();

  // If the snapshot object reference changed, rebuild the index
  if (!cachedSnapshotRef || cachedSnapshotRef.deref() !== snapshot) {
    cachedSnapshotRef = new WeakRef(snapshot);
    cachedIndex = buildIndex(snapshot);
  }

  return { snapshot, idx: cachedIndex! };
};

// ── Private helpers ─────────────────────────────────────────

const findViewerMembership = (
  idx: SnapshotIndex,
  communityId: string,
  viewerId: string | null,
) => {
  if (!viewerId) {
    return null;
  }

  return idx.membershipByCommunityUser.get(`${communityId}:${viewerId}`) ?? null;
};

// ── Public queries ──────────────────────────────────────────

export const getViewer = async () => {
  const viewerUserId = await getViewerUserId();

  if (!viewerUserId) {
    return null;
  }

  const { idx } = await getIndexedSnapshot();

  return idx.usersById.get(viewerUserId) ?? null;
};

export const listConnectableUsers = async () => {
  const { snapshot } = await getIndexedSnapshot();

  return snapshot.users
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
};

export const listCommunityCards = async () => {
  const { snapshot, idx } = await getIndexedSnapshot();

  return snapshot.communities
    .map((community) => {
      const author = idx.usersById.get(community.createdByUserId);
      const visualProfile = getCommunityVisualProfile(community.slug, community.name);

      if (!author) {
        throw new Error(`Missing creator for community ${community.slug}.`);
      }

      return {
        id: community.id,
        slug: community.slug,
        name: community.name,
        ticker: community.ticker,
        tagline: community.tagline,
        description: community.description,
        rules: community.rules,
        bannerUrl: community.bannerUrl,
        thumbnailUrl:
          communityThumbnailOverrides[community.slug] ?? community.thumbnailUrl,
        memberCount: community.memberCount,
        activeNow: Math.max(1, Math.round(community.memberCount * 0.08)),
        trendingRank: 0,
        createdBy: toMemberIdentity(
          author,
          "admin",
          verifiedHandles.has(author.xHandle),
        ),
        contractAddress: community.contractAddress,
        ...visualProfile,
      } satisfies CommunityRecord;
    })
    .sort(communitySort)
    .map((community, index) => ({
      ...community,
      trendingRank: index + 1,
    }));
};

export const listTrendingCommunityCards = async () => {
  return (await listCommunityCards()).slice(0, 3);
};

/**
 * List communities the current viewer has actively joined, sorted by most
 * recently joined first. Returns [] if no viewer is logged in.
 */
export const listMyCommunities = async () => {
  const viewerId = await getViewerUserId();
  if (!viewerId) return [];

  const { snapshot, idx } = await getIndexedSnapshot();
  const memberships = idx.membershipsByUser.get(viewerId) ?? [];
  const activeMemberships = memberships.filter((m) => m.status === "active");

  const allCards = await listCommunityCards();
  const cardBySlug = new Map(allCards.map((c) => [c.slug, c]));

  return activeMemberships
    .map((membership) => {
      const community = idx.communitiesById.get(membership.communityId);
      if (!community) return null;
      const card = cardBySlug.get(community.slug);
      if (!card) return null;
      return {
        ...card,
        role: membership.role,
        joinedAt: membership.createdAt,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => Date.parse(right.joinedAt) - Date.parse(left.joinedAt));
};

const toPostRecord = (
  idx: SnapshotIndex,
  postId: string,
  viewerId: string | null,
) => {
  const post = idx.postsByIdMap.get(postId);

  if (!post) {
    return null;
  }

  const author = idx.usersById.get(post.authorUserId);
  const community = idx.communitiesById.get(post.communityId);
  const membership = idx.membershipByCommunityUser.get(
    `${post.communityId}:${post.authorUserId}`,
  );

  if (!author || !community) {
    return null;
  }

  const rawReplies = idx.repliesByPost.get(post.id) ?? [];
  const replies = rawReplies
    .reduce<CommunityReplyRecord[]>((items, entry) => {
      const replyAuthor = idx.usersById.get(entry.authorUserId);
      const replyMembership = idx.membershipByCommunityUser.get(
        `${post.communityId}:${entry.authorUserId}`,
      );

      if (!replyAuthor) {
        return items;
      }

      items.push({
        id: entry.id,
        postId: entry.postId,
        author: toMemberIdentity(
          replyAuthor,
          replyMembership?.role,
          verifiedHandles.has(replyAuthor.xHandle),
        ),
        body: entry.body,
        createdAt: entry.createdAt,
      });

      return items;
    }, [])
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

  const viewerRepostReaction = viewerId
    ? idx.reactionByPostUserKind.get(`${post.id}:${viewerId}:repost`)
    : undefined;
  const viewerLikeReaction = viewerId
    ? idx.reactionByPostUserKind.get(`${post.id}:${viewerId}:like`)
    : undefined;

  return {
    id: post.id,
    communitySlug: community.slug,
    author: toMemberIdentity(
      author,
      membership?.status === "active" ? membership?.role : undefined,
      verifiedHandles.has(author.xHandle),
    ),
    body: post.body,
    createdAt: post.createdAt,
    isPinned: post.isPinned,
    metrics: {
      replies: post.replyCount,
      reposts: post.repostCount,
      likes: post.likeCount,
      views: post.viewCount,
    },
    replies,
    media: post.media,
    xSyncStatus: post.xSyncStatus,
    externalPostId: post.externalPostId,
    viewerRepostXSyncStatus: viewerRepostReaction?.xSyncStatus,
    viewerHasLiked: Boolean(viewerLikeReaction),
    viewerHasReposted: Boolean(viewerRepostReaction),
    quotedPost: post.quotedPostId ? (() => {
      const qp = idx.postsByIdMap.get(post.quotedPostId);
      if (!qp) return undefined;
      const qpAuthor = idx.usersById.get(qp.authorUserId);
      if (!qpAuthor) return undefined;
      const qpCommunity = idx.communitiesById.get(qp.communityId);
      const qpMembership = qpCommunity
        ? idx.membershipByCommunityUser.get(`${qpCommunity.id}:${qpAuthor.id}`)
        : undefined;
      return {
        id: qp.id,
        author: toMemberIdentity(
          qpAuthor,
          qpMembership?.status === "active" ? qpMembership?.role : undefined,
          verifiedHandles.has(qpAuthor.xHandle),
        ),
        body: qp.body,
        createdAt: qp.createdAt,
      };
    })() : undefined,
  } satisfies CommunityPostRecord & {
    viewerHasLiked: boolean;
    viewerHasReposted: boolean;
  };
};

export const listDiscoverFeedPosts = async () => {
  const { snapshot, idx } = await getIndexedSnapshot();
  const viewerId = await getViewerUserId();

  return snapshot.posts
    .map((post) => toPostRecord(idx, post.id, viewerId))
    .filter(
      (post): post is NonNullable<ReturnType<typeof toPostRecord>> => post !== null,
    )
    .sort((left, right) => right.metrics.views - left.metrics.views);
};

export const getUserProfileView = async (handle: string) => {
  const { snapshot, idx } = await getIndexedSnapshot();
  const viewerId = await getViewerUserId();

  // Normalize handle — accept with or without @
  const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const user = snapshot.users.find(
    (entry) => entry.xHandle.toLowerCase() === normalizedHandle.toLowerCase(),
  );

  if (!user) {
    return null;
  }

  const userMemberships = idx.membershipsByUser.get(user.id) ?? [];
  const memberships = userMemberships
    .filter((entry) => entry.status === "active")
    .map((entry) => {
      const community = idx.communitiesById.get(entry.communityId);
      return community
        ? {
            communitySlug: community.slug,
            communityName: community.name,
            communityBannerUrl: community.bannerUrl,
            role: entry.role,
            joinedAt: entry.createdAt,
            ...getCommunityVisualProfile(community.slug, community.name),
          }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const posts = snapshot.posts
    .filter((entry) => entry.authorUserId === user.id)
    .map((entry) => toPostRecord(idx, entry.id, viewerId))
    .filter(
      (post): post is NonNullable<ReturnType<typeof toPostRecord>> => post !== null,
    )
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  const viewer = idx.usersById.get(viewerId ?? "") ?? null;

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      xHandle: user.xHandle,
      avatar: user.avatar,
      verified: verifiedHandles.has(user.xHandle),
      isViewer: user.id === viewerId,
    },
    viewer,
    memberships,
    posts,
    stats: {
      posts: posts.length,
      communities: memberships.length,
      totalLikes: posts.reduce((sum, post) => sum + post.metrics.likes, 0),
    },
  };
};

export const getCommunityTimelineView = async (slug: string) => {
  const { idx } = await getIndexedSnapshot();
  const viewerId = await getViewerUserId();
  const viewer = idx.usersById.get(viewerId ?? "") ?? null;
  const communityCards = await listCommunityCards();
  const community = communityCards.find((entry) => entry.slug === slug) ?? null;

  if (!community) {
    return null;
  }

  const rawCommunity = idx.communitiesBySlug.get(slug);

  if (!rawCommunity) {
    return null;
  }

  const viewerMembership = findViewerMembership(idx, rawCommunity.id, viewerId);
  const communityMemberships = idx.membershipsByCommunity.get(rawCommunity.id) ?? [];
  const members = communityMemberships
    .filter((entry) => entry.status === "active")
    .reduce<CommunityMemberRecord[]>((items, entry) => {
      const member = idx.usersById.get(entry.userId);

      if (!member) {
        return items;
      }

      items.push({
        userId: member.id,
        displayName: member.displayName,
        handle: member.xHandle,
        avatar: member.avatar,
        role: entry.role,
        verified: verifiedHandles.has(member.xHandle),
        joinedAt: entry.createdAt,
        status: entry.status,
        isViewer: member.id === viewerId,
      });

      return items;
    }, [])
    .sort((left, right) => {
      const roleDifference =
        membershipRoleOrder[left.role ?? "member"] -
        membershipRoleOrder[right.role ?? "member"];

      if (roleDifference !== 0) {
        return roleDifference;
      }

      return left.displayName.localeCompare(right.displayName);
    });

  const communityPosts = idx.postsByCommunity.get(rawCommunity.id) ?? [];
  const posts = communityPosts
    .map((entry) => toPostRecord(idx, entry.id, viewerId))
    .filter(
      (post): post is NonNullable<ReturnType<typeof toPostRecord>> => post !== null,
    )
    .sort((left, right) => {
      // Pinned posts always first
      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }
      // Then most recent first
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });

  return {
    viewer,
    community,
    viewerMembershipStatus: viewerMembership?.status ?? (null as MembershipStatus | null),
    viewerRole: viewerMembership?.role ?? (null as CommunityRole | null),
    members,
    posts,
    relatedCommunities: communityCards.filter((entry) => entry.slug !== slug).slice(0, 3),
  };
};
