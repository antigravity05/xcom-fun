import type {
  CommunityPostMedia,
  CommunityRole,
  MembershipStatus,
  PublicationStatus,
} from "@/lib/xcom-domain";

export type XcomStoreUser = {
  id: string;
  xUserId: string;
  xHandle: string;
  displayName: string;
  avatar: string;
};

export type XcomStoreCommunity = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  tagline: string;
  description: string;
  rules: string[];
  bannerUrl?: string;
  thumbnailUrl?: string;
  contractAddress?: string;
  createdByUserId: string;
  memberCount: number;
  createdAt: string;
};

export type XcomStoreMembership = {
  id: string;
  communityId: string;
  userId: string;
  role: CommunityRole;
  status: MembershipStatus;
  createdAt: string;
};

export type XcomStorePost = {
  id: string;
  communityId: string;
  /**
   * Set for native posts and for imported tweets whose author has a
   * x-com.fun account. NULL for "ghost" imports (X user not yet on the
   * platform). Filled in retroactively on signup.
   */
  authorUserId: string | null;
  body: string;
  media?: CommunityPostMedia;
  isPinned?: boolean;
  quotedPostId?: string;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  viewCount: number;
  createdAt: string;
  xSyncStatus: PublicationStatus;
  externalPostId?: string;
  /** Snapshot of the original X tweet, set on import. NULL for native posts. */
  external?: {
    tweetId: string;
    authorHandle: string;
    authorDisplayName: string;
    authorAvatarUrl: string | null;
    likes: number | null;
    reposts: number | null;
    postedAt: string;
  };
};

export type XcomStoreReply = {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export type XcomStoreReaction = {
  id: string;
  postId: string;
  userId: string;
  kind: "like" | "repost";
  xSyncStatus?: PublicationStatus;
  createdAt: string;
};

export type XcomStoreSnapshot = {
  users: XcomStoreUser[];
  communities: XcomStoreCommunity[];
  memberships: XcomStoreMembership[];
  posts: XcomStorePost[];
  replies: XcomStoreReply[];
  reactions: XcomStoreReaction[];
};
