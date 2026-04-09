import type {
  CommunityPostRecord,
  CommunityRecord,
  CommunityTab,
} from "@/lib/xcom-domain";

const communities: CommunityRecord[] = [
  {
    id: "community-bug-bounty",
    slug: "claude-bug-bounty",
    name: "Claude Bug Bounty",
    ticker: "$BUG",
    tagline: "Alpha, audits and public receipts for builder-led communities.",
    description:
      "A public signal room for security-first crypto builders. Members discuss launches, bug bounties, treasury moves and post them fast enough to hit both the community feed and their own X profile.",
    rules: [
      "Bring signals with context, not one-line shilling.",
      "If you post a thesis, back it with execution or data.",
      "No wallet-draining links, fake mint pages or impersonation.",
    ],
    memberCount: 18420,
    activeNow: 981,
    trendingRank: 1,
    createdBy: {
      displayName: "Shuvonsec",
      handle: "@shuvonsec",
      avatar: "S",
      role: "admin",
      verified: true,
    },
    avatar: "CB",
    accentColor: "#52a9ff",
    coverFrom: "#081324",
    coverTo: "#133b73",
    contractAddress: "0x7b9e31277b4e5f64a402d9fe7ffef8c98d101e07",
  },
  {
    id: "community-opus",
    slug: "opus",
    name: "OPUS",
    ticker: "$OPUS",
    tagline: "Autonomous AI agents, memecoin velocity and public trade chatter.",
    description:
      "OPUS is where agent-native meme projects keep the timeline hot. Every post lives inside the community, then fans out through each poster's own X account for maximum reach.",
    rules: [
      "Posts must stay relevant to OPUS or adjacent agent plays.",
      "No fake fills, no deleted-entry screenshots.",
      "Use the community to coordinate, not to spam.",
    ],
    memberCount: 9320,
    activeNow: 421,
    trendingRank: 2,
    createdBy: {
      displayName: "rdbotato",
      handle: "@rdbotato",
      avatar: "R",
      role: "admin",
      verified: true,
    },
    avatar: "OP",
    accentColor: "#ffd166",
    coverFrom: "#30210a",
    coverTo: "#805315",
    contractAddress: "7q0neP3fF1a7f1hK2k3x9bg8PPo9NAz1r22R1pudump",
  },
  {
    id: "community-solstice",
    slug: "solstice-labs",
    name: "Solstice Labs",
    ticker: "$SOLS",
    tagline: "Launch coordination, liquidity campaigns and daily ship logs.",
    description:
      "A calmer command deck for token teams that want the familiarity of X Communities with tighter information architecture and reliable content syndication.",
    rules: [
      "Ship logs beat hype threads.",
      "Metrics over mood.",
      "Respect the feed density. Post clean, then iterate in replies.",
    ],
    memberCount: 6115,
    activeNow: 203,
    trendingRank: 3,
    createdBy: {
      displayName: "Marin",
      handle: "@marinbuilds",
      avatar: "M",
      role: "admin",
      verified: false,
    },
    avatar: "SL",
    accentColor: "#53f1c4",
    coverFrom: "#05261e",
    coverTo: "#0d5c48",
    contractAddress: "0x85ad93797cb57f816214e356ac4dd8b0fdbe4a82",
  },
];

const posts: CommunityPostRecord[] = [
  {
    id: "post-bug-1",
    communitySlug: "claude-bug-bounty",
    author: {
      displayName: "Shuvonsec",
      handle: "@shuvonsec",
      avatar: "S",
      role: "admin",
      verified: true,
    },
    body:
      "I've bought back 1% of the supply and locked it for 3 months. I'm committed to this community and building for the long term.\n\nMore buybacks, locks and burns are coming. Stay tuned.\n\n$Bug is here to stay.",
    createdAt: "2026-04-08T20:00:00.000Z",
    isPinned: true,
    metrics: {
      replies: 4,
      reposts: 8,
      likes: 21,
      views: 1300,
    },
    replies: [],
    media: {
      kind: "spotlight",
      title: "Claude Bug Bounty",
      subtitle: "10,000,000 BUG locked until 2026-06-06",
      footer: "Streamflow verified lock",
    },
    xSyncStatus: "published",
  },
  {
    id: "post-bug-2",
    communitySlug: "claude-bug-bounty",
    author: {
      displayName: "MeatSOS",
      handle: "@SpaceOutJim",
      avatar: "M",
      verified: false,
    },
    body:
      "Full stacked Dev building, community's growing, holders are increasing...\n\nYou're early.\n\n$Bug higher.",
    createdAt: "2026-04-08T18:55:00.000Z",
    metrics: {
      replies: 1,
      reposts: 1,
      likes: 1,
      views: 53,
    },
    replies: [],
    xSyncStatus: "published",
  },
  {
    id: "post-opus-1",
    communitySlug: "opus",
    author: {
      displayName: "rdbotato",
      handle: "@rdbotato",
      avatar: "R",
      role: "admin",
      verified: true,
    },
    body:
      "Only $OPUS.\n\nAgent-native execution matters more than narrative. Use this room for concrete entries, treasury actions and launch timing.",
    createdAt: "2026-04-08T21:05:00.000Z",
    isPinned: true,
    metrics: {
      replies: 0,
      reposts: 3,
      likes: 9,
      views: 448,
    },
    replies: [],
    media: {
      kind: "bulletin",
      title: "Execution board live",
      subtitle: "Longs, exits and cumulative realized PnL snapshots",
      footer: "Community bulletin attached",
    },
    xSyncStatus: "published",
  },
  {
    id: "post-opus-2",
    communitySlug: "opus",
    author: {
      displayName: "Kaka",
      handle: "@Kaka",
      avatar: "K",
      verified: false,
    },
    body:
      "Hey bros, who's printing?\n\nUse replies for live entries, not the main feed.",
    createdAt: "2026-04-08T20:12:00.000Z",
    metrics: {
      replies: 0,
      reposts: 0,
      likes: 0,
      views: 12,
    },
    replies: [],
    xSyncStatus: "pending",
  },
  {
    id: "post-sols-1",
    communitySlug: "solstice-labs",
    author: {
      displayName: "Marin",
      handle: "@marinbuilds",
      avatar: "M",
      role: "admin",
      verified: false,
    },
    body:
      "Ship log for today:\n\n- brand pass approved\n- creator waitlist open\n- X sync worker split from compose request path\n\nThis is exactly the kind of boring infrastructure that lets us move faster next week.",
    createdAt: "2026-04-08T17:20:00.000Z",
    metrics: {
      replies: 6,
      reposts: 4,
      likes: 19,
      views: 840,
    },
    replies: [],
    xSyncStatus: "failed",
  },
  {
    id: "post-sols-2",
    communitySlug: "solstice-labs",
    author: {
      displayName: "Aya",
      handle: "@ayaops",
      avatar: "A",
      verified: true,
    },
    body:
      "If the product promise is 'post locally and distribute to X', then failed sync states need to be first-class UX.\n\nDon't hide operational truth from users.",
    createdAt: "2026-04-08T16:45:00.000Z",
    metrics: {
      replies: 3,
      reposts: 7,
      likes: 14,
      views: 614,
    },
    replies: [],
    xSyncStatus: "published",
  },
];

export const listCommunities = () => {
  return [...communities].sort((left, right) => left.trendingRank - right.trendingRank);
};

export const listTrendingCommunities = () => {
  return listCommunities().slice(0, 3);
};

export const listDiscoverPosts = () => {
  return [...posts].sort((left, right) => {
    return right.metrics.views - left.metrics.views;
  });
};

export const getCommunityBySlug = (slug: string) => {
  return communities.find((community) => community.slug === slug) ?? null;
};

export const getCommunityPosts = (slug: string, tab: CommunityTab) => {
  const scopedPosts = posts.filter((post) => post.communitySlug === slug);

  if (tab === "media") {
    return scopedPosts.filter((post) => post.media);
  }

  if (tab === "latest") {
    return [...scopedPosts].sort((left, right) => {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }

  return [...scopedPosts].sort((left, right) => {
    const leftScore = left.metrics.likes + left.metrics.views;
    const rightScore = right.metrics.likes + right.metrics.views;

    return rightScore - leftScore;
  });
};

export const getRelatedCommunities = (currentSlug: string) => {
  return listCommunities().filter((community) => community.slug !== currentSlug);
};
