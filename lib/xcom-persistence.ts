import "server-only";

import type {
  CommunityPostMedia,
  CommunityRole,
  MembershipStatus,
  PublicationStatus,
} from "@/lib/xcom-domain";
import {
  createCommunity,
  deleteCommunity,
  deletePost,
  createPost,
  createReply,
  joinCommunity,
  leaveCommunity,
  setMemberRole,
  toggleRepost,
  togglePinnedPost,
  toggleLike,
  updateCommunity,
  updatePost,
} from "@/lib/xcom-operations";
import type { XcomStoreSnapshot, XcomStoreUser } from "@/lib/xcom-store";

const useDatabase = () => Boolean(process.env.DATABASE_URL);

const getDbPersistence = async () => {
  return await import("@/lib/db-persistence");
};

/** Filesystem helpers — only loaded when DATABASE_URL is NOT set (local dev). */
const getFileStorePaths = () => {
  const path = require("node:path") as typeof import("node:path");
  const dataDirectory = path.join(process.cwd(), "data");
  const storeFilePath = path.join(dataDirectory, "xcom-store.json");
  return { dataDirectory, storeFilePath };
};

const createSeedUser = (
  id: string,
  xUserId: string,
  xHandle: string,
  displayName: string,
  avatar: string,
): XcomStoreUser => {
  return {
    id,
    xUserId,
    xHandle,
    displayName,
    avatar,
  };
};

export const initialStoreSnapshot: XcomStoreSnapshot = {
  users: [
    createSeedUser("user-ahmed", "x-ahmed", "@ahmedx", "Ahmed", "AH"),
    createSeedUser("user-shuvonsec", "x-shuvonsec", "@shuvonsec", "Shuvonsec", "S"),
    createSeedUser("user-meatsos", "x-meatsos", "@SpaceOutJim", "MeatSOS", "M"),
    createSeedUser("user-rdbotato", "x-rdbotato", "@rdbotato", "rdbotato", "R"),
    createSeedUser("user-kaka", "x-kaka", "@Kaka", "Kaka", "K"),
    createSeedUser("user-marin", "x-marin", "@marinbuilds", "Marin", "M"),
    createSeedUser("user-aya", "x-aya", "@ayaops", "Aya", "A"),
  ],
  communities: [
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
      contractAddress: "0x7b9e31277b4e5f64a402d9fe7ffef8c98d101e07",
      createdByUserId: "user-shuvonsec",
      memberCount: 3,
      createdAt: "2026-04-08T20:00:00.000Z",
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
      contractAddress: "7q0neP3fF1a7f1hK2k3x9bg8PPo9NAz1r22R1pudump",
      createdByUserId: "user-rdbotato",
      memberCount: 2,
      createdAt: "2026-04-08T21:05:00.000Z",
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
      contractAddress: "0x85ad93797cb57f816214e356ac4dd8b0fdbe4a82",
      createdByUserId: "user-marin",
      memberCount: 2,
      createdAt: "2026-04-08T17:20:00.000Z",
    },
  ],
  memberships: [
    {
      id: "membership-bug-admin",
      communityId: "community-bug-bounty",
      userId: "user-shuvonsec",
      role: "admin" satisfies CommunityRole,
      status: "active" satisfies MembershipStatus,
      createdAt: "2026-04-08T20:00:00.000Z",
    },
    {
      id: "membership-bug-meatsos",
      communityId: "community-bug-bounty",
      userId: "user-meatsos",
      role: "member",
      status: "active",
      createdAt: "2026-04-08T18:55:00.000Z",
    },
    {
      id: "membership-bug-ahmed",
      communityId: "community-bug-bounty",
      userId: "user-ahmed",
      role: "member",
      status: "active",
      createdAt: "2026-04-08T19:30:00.000Z",
    },
    {
      id: "membership-opus-admin",
      communityId: "community-opus",
      userId: "user-rdbotato",
      role: "admin",
      status: "active",
      createdAt: "2026-04-08T21:05:00.000Z",
    },
    {
      id: "membership-opus-kaka",
      communityId: "community-opus",
      userId: "user-kaka",
      role: "member",
      status: "active",
      createdAt: "2026-04-08T20:12:00.000Z",
    },
    {
      id: "membership-solstice-admin",
      communityId: "community-solstice",
      userId: "user-marin",
      role: "admin",
      status: "active",
      createdAt: "2026-04-08T17:20:00.000Z",
    },
    {
      id: "membership-solstice-aya",
      communityId: "community-solstice",
      userId: "user-aya",
      role: "member",
      status: "active",
      createdAt: "2026-04-08T16:45:00.000Z",
    },
  ],
  posts: [
    {
      id: "post-bug-1",
      communityId: "community-bug-bounty",
      authorUserId: "user-shuvonsec",
      body: "I've bought back 1% of the supply and locked it for 3 months. I'm committed to this community and building for the long term.\n\nMore buybacks, locks and burns are coming. Stay tuned.\n\n$Bug is here to stay.",
      media: {
        kind: "spotlight" satisfies CommunityPostMedia["kind"],
        title: "Claude Bug Bounty",
        subtitle: "10,000,000 BUG locked until 2026-06-06",
        footer: "Streamflow verified lock",
      },
      isPinned: true,
      replyCount: 4,
      likeCount: 21,
      repostCount: 8,
      viewCount: 1300,
      createdAt: "2026-04-08T20:00:00.000Z",
      xSyncStatus: "published" satisfies PublicationStatus,
    },
    {
      id: "post-bug-2",
      communityId: "community-bug-bounty",
      authorUserId: "user-meatsos",
      body: "Full stacked Dev building, community's growing, holders are increasing...\n\nYou're early.\n\n$Bug higher.",
      replyCount: 1,
      likeCount: 1,
      repostCount: 1,
      viewCount: 53,
      createdAt: "2026-04-08T18:55:00.000Z",
      xSyncStatus: "published",
    },
    {
      id: "post-opus-1",
      communityId: "community-opus",
      authorUserId: "user-rdbotato",
      body: "Only $OPUS.\n\nAgent-native execution matters more than narrative. Use this room for concrete entries, treasury actions and launch timing.",
      media: {
        kind: "bulletin",
        title: "Execution board live",
        subtitle: "Longs, exits and cumulative realized PnL snapshots",
        footer: "Community bulletin attached",
      },
      isPinned: true,
      replyCount: 0,
      likeCount: 9,
      repostCount: 3,
      viewCount: 448,
      createdAt: "2026-04-08T21:05:00.000Z",
      xSyncStatus: "published",
    },
    {
      id: "post-opus-2",
      communityId: "community-opus",
      authorUserId: "user-kaka",
      body: "Hey bros, who's printing?\n\nUse replies for live entries, not the main feed.",
      replyCount: 0,
      likeCount: 0,
      repostCount: 0,
      viewCount: 12,
      createdAt: "2026-04-08T20:12:00.000Z",
      xSyncStatus: "pending",
    },
    {
      id: "post-sols-1",
      communityId: "community-solstice",
      authorUserId: "user-marin",
      body: "Ship log for today:\n\n- brand pass approved\n- creator waitlist open\n- X sync worker split from compose request path\n\nThis is exactly the kind of boring infrastructure that lets us move faster next week.",
      replyCount: 6,
      likeCount: 19,
      repostCount: 4,
      viewCount: 840,
      createdAt: "2026-04-08T17:20:00.000Z",
      xSyncStatus: "failed",
    },
    {
      id: "post-sols-2",
      communityId: "community-solstice",
      authorUserId: "user-aya",
      body: "If the product promise is 'post locally and distribute to X', then failed sync states need to be first-class UX.\n\nDon't hide operational truth from users.",
      replyCount: 3,
      likeCount: 14,
      repostCount: 7,
      viewCount: 614,
      createdAt: "2026-04-08T16:45:00.000Z",
      xSyncStatus: "published",
    },
  ],
  replies: [
    { id: "reply-bug-1a", postId: "post-bug-1", authorUserId: "user-meatsos", body: "Lock looks clean. This is the kind of update people can verify fast.", createdAt: "2026-04-08T20:05:00.000Z" },
    { id: "reply-bug-1b", postId: "post-bug-1", authorUserId: "user-shuvonsec", body: "More receipts coming. I want every major move logged here first.", createdAt: "2026-04-08T20:07:00.000Z" },
    { id: "reply-bug-1c", postId: "post-bug-1", authorUserId: "user-meatsos", body: "That makes distribution updates way easier to trust.", createdAt: "2026-04-08T20:09:00.000Z" },
    { id: "reply-bug-1d", postId: "post-bug-1", authorUserId: "user-shuvonsec", body: "Exactly. Less narrative, more onchain proof.", createdAt: "2026-04-08T20:11:00.000Z" },
    { id: "reply-bug-2a", postId: "post-bug-2", authorUserId: "user-shuvonsec", body: "Keep posting updates like this in replies as the holder count moves.", createdAt: "2026-04-08T19:01:00.000Z" },
    { id: "reply-sols-1a", postId: "post-sols-1", authorUserId: "user-aya", body: "Good split. The compose path should stay fast even when X is slow.", createdAt: "2026-04-08T17:26:00.000Z" },
    { id: "reply-sols-1b", postId: "post-sols-1", authorUserId: "user-marin", body: "That was the goal. Failures need to degrade gracefully, not block the feed.", createdAt: "2026-04-08T17:29:00.000Z" },
    { id: "reply-sols-1c", postId: "post-sols-1", authorUserId: "user-aya", body: "Did you keep enough metadata to retry without rewriting the post?", createdAt: "2026-04-08T17:34:00.000Z" },
    { id: "reply-sols-1d", postId: "post-sols-1", authorUserId: "user-marin", body: "Yes. Community post id plus author context is enough for a clean retry worker.", createdAt: "2026-04-08T17:40:00.000Z" },
    { id: "reply-sols-1e", postId: "post-sols-1", authorUserId: "user-aya", body: "Perfect. That should make sync status feel honest instead of scary.", createdAt: "2026-04-08T17:46:00.000Z" },
    { id: "reply-sols-1f", postId: "post-sols-1", authorUserId: "user-marin", body: "Exactly the direction. Operational truth first, cosmetics second.", createdAt: "2026-04-08T17:51:00.000Z" },
    { id: "reply-sols-2a", postId: "post-sols-2", authorUserId: "user-marin", body: "Agreed. People tolerate failure states if the app is explicit about them.", createdAt: "2026-04-08T16:50:00.000Z" },
    { id: "reply-sols-2b", postId: "post-sols-2", authorUserId: "user-aya", body: "And if retries are obvious. Hidden queues are where trust disappears.", createdAt: "2026-04-08T16:53:00.000Z" },
    { id: "reply-sols-2c", postId: "post-sols-2", authorUserId: "user-marin", body: "I'll add a clean retry path next. No magic, just status plus action.", createdAt: "2026-04-08T16:58:00.000Z" },
  ],
  reactions: [],
};

const ensureStoreFile = async () => {
  const { mkdir, readFile, writeFile } = await import("node:fs/promises");
  const { dataDirectory, storeFilePath } = getFileStorePaths();
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(storeFilePath, "utf8");
  } catch {
    await writeFile(storeFilePath, JSON.stringify(initialStoreSnapshot, null, 2), "utf8");
  }
};

export const readXcomStore = async (): Promise<XcomStoreSnapshot> => {
  if (useDatabase()) {
    const dbPersistence = await getDbPersistence();
    return await dbPersistence.readXcomStore();
  }

  // Serverless environments (Vercel) have a read-only filesystem.
  // If DATABASE_URL is missing there, we cannot fall back to JSON.
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is required in production. Set it in Vercel Environment Variables.",
    );
  }

  await ensureStoreFile();
  const { readFile } = await import("node:fs/promises");
  const { storeFilePath } = getFileStorePaths();
  const content = await readFile(storeFilePath, "utf8");
  return JSON.parse(content) as XcomStoreSnapshot;
};

const writeXcomStore = async (snapshot: XcomStoreSnapshot) => {
  const { writeFile } = await import("node:fs/promises");
  const { storeFilePath } = getFileStorePaths();
  await ensureStoreFile();
  await writeFile(storeFilePath, JSON.stringify(snapshot, null, 2), "utf8");
};

export const updateXcomStore = async (
  mutator: (snapshot: XcomStoreSnapshot) => XcomStoreSnapshot,
) => {
  if (useDatabase()) {
    // In DB mode, read from DB, apply mutation, but don't write back to JSON.
    // The caller should use the specific apply* functions instead.
    const currentSnapshot = await readXcomStore();
    return mutator(currentSnapshot);
  }

  const currentSnapshot = await readXcomStore();
  const nextSnapshot = mutator(currentSnapshot);
  await writeXcomStore(nextSnapshot);
  return nextSnapshot;
};

const withDbFallback = <T extends unknown[]>(
  dbMethod: string,
  jsonFallback: (...args: T) => Promise<XcomStoreSnapshot>,
) => {
  return async (...args: T): Promise<XcomStoreSnapshot> => {
    if (useDatabase()) {
      const dbPersistence = await getDbPersistence();
      return await (dbPersistence as Record<string, (...args: unknown[]) => Promise<XcomStoreSnapshot>>)[dbMethod](...args);
    }
    return jsonFallback(...args);
  };
};

export const applyCreateCommunity = withDbFallback(
  "applyCreateCommunity",
  (input: Parameters<typeof createCommunity>[1]) =>
    updateXcomStore((snapshot) => createCommunity(snapshot, input)),
);

export const applyUpdateCommunity = withDbFallback(
  "applyUpdateCommunity",
  (input: Parameters<typeof updateCommunity>[1]) =>
    updateXcomStore((snapshot) => updateCommunity(snapshot, input)),
);

export const applyDeleteCommunity = withDbFallback(
  "applyDeleteCommunity",
  (input: Parameters<typeof deleteCommunity>[1]) =>
    updateXcomStore((snapshot) => deleteCommunity(snapshot, input)),
);

export const applyJoinCommunity = withDbFallback(
  "applyJoinCommunity",
  (input: Parameters<typeof joinCommunity>[1]) =>
    updateXcomStore((snapshot) => joinCommunity(snapshot, input)),
);

export const applyLeaveCommunity = withDbFallback(
  "applyLeaveCommunity",
  (input: Parameters<typeof leaveCommunity>[1]) =>
    updateXcomStore((snapshot) => leaveCommunity(snapshot, input)),
);

export const applyCreatePost = withDbFallback(
  "applyCreatePost",
  (input: Parameters<typeof createPost>[1]) =>
    updateXcomStore((snapshot) => createPost(snapshot, input)),
);

export const applyCreateReply = withDbFallback(
  "applyCreateReply",
  (input: Parameters<typeof createReply>[1]) =>
    updateXcomStore((snapshot) => createReply(snapshot, input)),
);

export const applyUpdatePost = withDbFallback(
  "applyUpdatePost",
  (input: Parameters<typeof updatePost>[1]) =>
    updateXcomStore((snapshot) => updatePost(snapshot, input)),
);

export const applyDeletePost = withDbFallback(
  "applyDeletePost",
  (input: Parameters<typeof deletePost>[1]) =>
    updateXcomStore((snapshot) => deletePost(snapshot, input)),
);

export const applyTogglePinnedPost = withDbFallback(
  "applyTogglePinnedPost",
  (input: Parameters<typeof togglePinnedPost>[1]) =>
    updateXcomStore((snapshot) => togglePinnedPost(snapshot, input)),
);

export const applySetMemberRole = withDbFallback(
  "applySetMemberRole",
  (input: Parameters<typeof setMemberRole>[1]) =>
    updateXcomStore((snapshot) => setMemberRole(snapshot, input)),
);

export const applyToggleRepost = withDbFallback(
  "applyToggleRepost",
  (input: Parameters<typeof toggleRepost>[1]) =>
    updateXcomStore((snapshot) => toggleRepost(snapshot, input)),
);

export const applyToggleLike = withDbFallback(
  "applyToggleLike",
  (input: Parameters<typeof toggleLike>[1]) =>
    updateXcomStore((snapshot) => toggleLike(snapshot, input)),
);
