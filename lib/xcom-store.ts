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
  authorUserId: string;
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
