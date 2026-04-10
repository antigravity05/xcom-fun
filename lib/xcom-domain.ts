export type CommunityRole = "member" | "moderator" | "admin";

export type MembershipStatus = "active" | "pending" | "invited";

export type PublicationStatus = "draft" | "pending" | "published" | "failed";

export type CommunityTab = "top" | "latest" | "media" | "members" | "about";

export type MemberIdentity = {
  displayName: string;
  handle: string;
  avatar: string;
  role?: CommunityRole;
  verified?: boolean;
};

export type CommunityRecord = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  tagline: string;
  description: string;
  rules: string[];
  bannerUrl?: string;
  memberCount: number;
  activeNow: number;
  trendingRank: number;
  createdBy: MemberIdentity;
  avatar: string;
  accentColor: string;
  coverFrom: string;
  coverTo: string;
  contractAddress?: string;
};

export type CommunityPostMetric = {
  replies: number;
  reposts: number;
  likes: number;
  views: number;
};

export type CommunityPostMedia =
  | {
      kind: "spotlight";
      title: string;
      subtitle: string;
      footer: string;
    }
  | {
      kind: "bulletin";
      title: string;
      subtitle: string;
      footer: string;
    }
  | {
      kind: "images";
      urls: string[];
    };

export type CommunityReplyRecord = {
  id: string;
  postId: string;
  author: MemberIdentity;
  body: string;
  createdAt: string;
};

export type CommunityMemberRecord = MemberIdentity & {
  userId: string;
  joinedAt: string;
  status: MembershipStatus;
  isViewer: boolean;
};

export type CommunityPostRecord = {
  id: string;
  communitySlug: string;
  author: MemberIdentity;
  body: string;
  createdAt: string;
  isPinned?: boolean;
  metrics: CommunityPostMetric;
  replies: CommunityReplyRecord[];
  media?: CommunityPostMedia;
  xSyncStatus: PublicationStatus;
  viewerRepostXSyncStatus?: PublicationStatus;
};

export const communityTabs: Array<{ id: CommunityTab; label: string }> = [
  { id: "top", label: "Top" },
  { id: "latest", label: "Latest" },
  { id: "media", label: "Media" },
  { id: "members", label: "Members" },
  { id: "about", label: "About" },
];
