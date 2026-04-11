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
import type { XcomStoreSnapshot, XcomStoreUser } from "@/lib/xcom-store";

type CommunityVisualProfile = {
  avatar: string;
  accentColor: string;
  coverFrom: string;
  coverTo: string;
};

const communityVisualProfiles: Record<string, CommunityVisualProfile> = {};

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

const findViewerMembership = (
  snapshot: XcomStoreSnapshot,
  communityId: string,
  viewerId: string | null,
) => {
  if (!viewerId) {
    return null;
  }

  return (
    snapshot.memberships.find(
      (entry) => entry.communityId === communityId && entry.userId === viewerId,
    ) ?? null
  );
};

export const getViewer = async () => {
  const viewerUserId = await getViewerUserId();

  if (!viewerUserId) {
    return null;
  }

  const snapshot = await readXcomStore();

  return snapshot.users.find((entry) => entry.id === viewerUserId) ?? null;
};

export const listConnectableUsers = async () => {
  const snapshot = await readXcomStore();

  return snapshot.users
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
};

export const listCommunityCards = async () => {
  const snapshot = await readXcomStore();

  return snapshot.communities
    .map((community) => {
      const author = snapshot.users.find((entry) => entry.id === community.createdByUserId);
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

const toPostRecord = (
  snapshot: XcomStoreSnapshot,
  postId: string,
  viewerId: string | null,
) => {
  const post = snapshot.posts.find((entry) => entry.id === postId);

  if (!post) {
    return null;
  }

  const author = snapshot.users.find((entry) => entry.id === post.authorUserId);
  const community = snapshot.communities.find((entry) => entry.id === post.communityId);
  const membership = snapshot.memberships.find(
    (entry) =>
      entry.communityId === post.communityId &&
      entry.userId === post.authorUserId &&
      entry.status === "active",
  );

  if (!author || !community) {
    return null;
  }

  const replies = snapshot.replies
    .filter((entry) => entry.postId === post.id)
    .reduce<CommunityReplyRecord[]>((items, entry) => {
      const replyAuthor = snapshot.users.find((user) => user.id === entry.authorUserId);
      const replyMembership = snapshot.memberships.find(
        (membershipEntry) =>
          membershipEntry.communityId === post.communityId &&
          membershipEntry.userId === entry.authorUserId &&
          membershipEntry.status === "active",
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

  return {
    id: post.id,
    communitySlug: community.slug,
    author: toMemberIdentity(
      author,
      membership?.role,
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
    viewerRepostXSyncStatus:
      snapshot.reactions.find(
        (entry) =>
          entry.postId === post.id &&
          entry.userId === viewerId &&
          entry.kind === "repost",
      )?.xSyncStatus,
    viewerHasLiked: Boolean(
      viewerId &&
        snapshot.reactions.find(
          (entry) =>
            entry.postId === post.id &&
            entry.userId === viewerId &&
            entry.kind === "like",
        ),
    ),
    viewerHasReposted: Boolean(
      viewerId &&
        snapshot.reactions.find(
          (entry) =>
            entry.postId === post.id &&
            entry.userId === viewerId &&
            entry.kind === "repost",
        ),
    ),
  } satisfies CommunityPostRecord & {
    viewerHasLiked: boolean;
    viewerHasReposted: boolean;
  };
};

export const listDiscoverFeedPosts = async () => {
  const snapshot = await readXcomStore();
  const viewerId = await getViewerUserId();

  return snapshot.posts
    .map((post) => toPostRecord(snapshot, post.id, viewerId))
    .filter(
      (post): post is NonNullable<ReturnType<typeof toPostRecord>> => post !== null,
    )
    .sort((left, right) => right.metrics.views - left.metrics.views);
};

export const getUserProfileView = async (handle: string) => {
  const snapshot = await readXcomStore();
  const viewerId = await getViewerUserId();

  // Normalize handle — accept with or without @
  const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const user = snapshot.users.find(
    (entry) => entry.xHandle.toLowerCase() === normalizedHandle.toLowerCase(),
  );

  if (!user) {
    return null;
  }

  const memberships = snapshot.memberships
    .filter((entry) => entry.userId === user.id && entry.status === "active")
    .map((entry) => {
      const community = snapshot.communities.find((c) => c.id === entry.communityId);
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
    .map((entry) => toPostRecord(snapshot, entry.id, viewerId))
    .filter(
      (post): post is NonNullable<ReturnType<typeof toPostRecord>> => post !== null,
    )
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  const viewer = snapshot.users.find((entry) => entry.id === viewerId) ?? null;

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
  const snapshot = await readXcomStore();
  const viewerId = await getViewerUserId();
  const viewer =
    snapshot.users.find((entry) => entry.id === viewerId) ?? null;
  const communityCards = await listCommunityCards();
  const community = communityCards.find((entry) => entry.slug === slug) ?? null;

  if (!community) {
    return null;
  }

  const rawCommunity = snapshot.communities.find((entry) => entry.slug === slug);

  if (!rawCommunity) {
    return null;
  }

  const viewerMembership = findViewerMembership(snapshot, rawCommunity.id, viewerId);
  const members = snapshot.memberships
    .filter(
      (entry) => entry.communityId === rawCommunity.id && entry.status === "active",
    )
    .reduce<CommunityMemberRecord[]>((items, entry) => {
      const member = snapshot.users.find((user) => user.id === entry.userId);

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

  const posts = snapshot.posts
    .filter((entry) => entry.communityId === rawCommunity.id)
    .map((entry) => toPostRecord(snapshot, entry.id, viewerId))
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
