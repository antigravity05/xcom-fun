import { getDb } from "@/lib/database/client";
import {
  users,
  communities,
  communityMemberships,
  posts,
  postReplies,
  postReactions,
} from "@/drizzle/schema";
import type {
  CommunityRole,
  MembershipStatus,
  PublicationStatus,
} from "@/lib/xcom-domain";

const seedData = {
  users: [
    {
      id: "user-alice",
      xUserId: "x-alice",
      xHandle: "@alice",
      displayName: "Alice",
      avatar: "A",
    },
    {
      id: "user-bob",
      xUserId: "x-bob",
      xHandle: "@bob",
      displayName: "Bob",
      avatar: "B",
    },
    {
      id: "user-charlie",
      xUserId: "x-charlie",
      xHandle: "@charlie",
      displayName: "Charlie",
      avatar: "C",
    },
    {
      id: "user-dave",
      xUserId: "x-dave",
      xHandle: "@dave",
      displayName: "Dave",
      avatar: "D",
    },
    {
      id: "user-eve",
      xUserId: "x-eve",
      xHandle: "@eve",
      displayName: "Eve",
      avatar: "E",
    },
    {
      id: "user-frank",
      xUserId: "x-frank",
      xHandle: "@frank",
      displayName: "Frank",
      avatar: "F",
    },
    {
      id: "user-grace",
      xUserId: "x-grace",
      xHandle: "@grace",
      displayName: "Grace",
      avatar: "G",
    },
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
      createdByUserId: "user-bob",
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
      createdByUserId: "user-dave",
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
      createdByUserId: "user-frank",
      memberCount: 2,
      createdAt: "2026-04-08T17:20:00.000Z",
    },
  ],
  memberships: [
    {
      id: "membership-bug-admin",
      communityId: "community-bug-bounty",
      userId: "user-bob",
      role: "admin" as CommunityRole,
      status: "active" as MembershipStatus,
      createdAt: "2026-04-08T20:00:00.000Z",
    },
    {
      id: "membership-bug-charlie",
      communityId: "community-bug-bounty",
      userId: "user-charlie",
      role: "member" as CommunityRole,
      status: "active" as MembershipStatus,
      createdAt: "2026-04-08T18:55:00.000Z",
    },
    {
      id: "membership-opus-admin",
      communityId: "community-opus",
      userId: "user-dave",
      role: "admin" as CommunityRole,
      status: "active" as MembershipStatus,
      createdAt: "2026-04-08T21:05:00.000Z",
    },
    {
      id: "membership-opus-eve",
      communityId: "community-opus",
      userId: "user-eve",
      role: "member" as CommunityRole,
      status: "active" as MembershipStatus,
      createdAt: "2026-04-08T20:12:00.000Z",
    },
    {
      id: "membership-solstice-admin",
      communityId: "community-solstice",
      userId: "user-frank",
      role: "admin" as CommunityRole,
      status: "active" as MembershipStatus,
      createdAt: "2026-04-08T17:20:00.000Z",
    },
    {
      id: "membership-solstice-grace",
      communityId: "community-solstice",
      userId: "user-grace",
      role: "member" as CommunityRole,
      status: "active" as MembershipStatus,
      createdAt: "2026-04-08T16:45:00.000Z",
    },
  ],
  posts: [
    {
      id: "post-bug-1",
      communityId: "community-bug-bounty",
      authorUserId: "user-bob",
      body:
        "I've bought back 1% of the supply and locked it for 3 months. I'm committed to this community and building for the long term.\n\nMore buybacks, locks and burns are coming. Stay tuned.\n\n$Bug is here to stay.",
      media: {
        kind: "spotlight",
        title: "Claude Bug Bounty",
        subtitle: "10,000,000 BUG locked until 2026-06-06",
        footer: "Streamflow verified lock",
      },
      isPinned: true,
      createdAt: "2026-04-08T20:00:00.000Z",
    },
    {
      id: "post-bug-2",
      communityId: "community-bug-bounty",
      authorUserId: "user-charlie",
      body:
        "Full stacked Dev building, community's growing, holders are increasing...\n\nYou're early.\n\n$Bug higher.",
      media: null,
      isPinned: false,
      createdAt: "2026-04-08T18:55:00.000Z",
    },
    {
      id: "post-opus-1",
      communityId: "community-opus",
      authorUserId: "user-dave",
      body:
        "Only $OPUS.\n\nAgent-native execution matters more than narrative. Use this room for concrete entries, treasury actions and launch timing.",
      media: {
        kind: "bulletin",
        title: "Execution board live",
        subtitle: "Longs, exits and cumulative realized PnL snapshots",
        footer: "Community bulletin attached",
      },
      isPinned: true,
      createdAt: "2026-04-08T21:05:00.000Z",
    },
    {
      id: "post-opus-2",
      communityId: "community-opus",
      authorUserId: "user-eve",
      body:
        "Hey bros, who's printing?\n\nUse replies for live entries, not the main feed.",
      media: null,
      isPinned: false,
      createdAt: "2026-04-08T20:12:00.000Z",
    },
    {
      id: "post-sols-1",
      communityId: "community-solstice",
      authorUserId: "user-frank",
      body:
        "Ship log for today:\n\n- brand pass approved\n- creator waitlist open\n- X sync worker split from compose request path\n\nThis is exactly the kind of boring infrastructure that lets us move faster next week.",
      media: null,
      isPinned: false,
      createdAt: "2026-04-08T17:20:00.000Z",
    },
    {
      id: "post-sols-2",
      communityId: "community-solstice",
      authorUserId: "user-grace",
      body:
        "If the product promise is 'post locally and distribute to X', then failed sync states need to be first-class UX.\n\nDon't hide operational truth from users.",
      media: null,
      isPinned: false,
      createdAt: "2026-04-08T16:45:00.000Z",
    },
  ],
  replies: [
    {
      id: "reply-bug-1a",
      postId: "post-bug-1",
      authorUserId: "user-charlie",
      body: "Lock looks clean. This is the kind of update people can verify fast.",
      createdAt: "2026-04-08T20:05:00.000Z",
    },
    {
      id: "reply-bug-1b",
      postId: "post-bug-1",
      authorUserId: "user-bob",
      body: "More receipts coming. I want every major move logged here first.",
      createdAt: "2026-04-08T20:07:00.000Z",
    },
    {
      id: "reply-bug-1c",
      postId: "post-bug-1",
      authorUserId: "user-charlie",
      body: "That makes distribution updates way easier to trust.",
      createdAt: "2026-04-08T20:09:00.000Z",
    },
    {
      id: "reply-bug-1d",
      postId: "post-bug-1",
      authorUserId: "user-bob",
      body: "Exactly. Less narrative, more onchain proof.",
      createdAt: "2026-04-08T20:11:00.000Z",
    },
    {
      id: "reply-bug-2a",
      postId: "post-bug-2",
      authorUserId: "user-bob",
      body: "Keep posting updates like this in replies as the holder count moves.",
      createdAt: "2026-04-08T19:01:00.000Z",
    },
    {
      id: "reply-sols-1a",
      postId: "post-sols-1",
      authorUserId: "user-grace",
      body: "Good split. The compose path should stay fast even when X is slow.",
      createdAt: "2026-04-08T17:26:00.000Z",
    },
    {
      id: "reply-sols-1b",
      postId: "post-sols-1",
      authorUserId: "user-frank",
      body: "That was the goal. Failures need to degrade gracefully, not block the feed.",
      createdAt: "2026-04-08T17:29:00.000Z",
    },
    {
      id: "reply-sols-1c",
      postId: "post-sols-1",
      authorUserId: "user-grace",
      body: "Did you keep enough metadata to retry without rewriting the post?",
      createdAt: "2026-04-08T17:34:00.000Z",
    },
    {
      id: "reply-sols-1d",
      postId: "post-sols-1",
      authorUserId: "user-frank",
      body: "Yes. Community post id plus author context is enough for a clean retry worker.",
      createdAt: "2026-04-08T17:40:00.000Z",
    },
    {
      id: "reply-sols-1e",
      postId: "post-sols-1",
      authorUserId: "user-grace",
      body: "Perfect. That should make sync status feel honest instead of scary.",
      createdAt: "2026-04-08T17:46:00.000Z",
    },
    {
      id: "reply-sols-1f",
      postId: "post-sols-1",
      authorUserId: "user-frank",
      body: "Exactly the direction. Operational truth first, cosmetics second.",
      createdAt: "2026-04-08T17:51:00.000Z",
    },
    {
      id: "reply-sols-2a",
      postId: "post-sols-2",
      authorUserId: "user-frank",
      body: "Agreed. People tolerate failure states if the app is explicit about them.",
      createdAt: "2026-04-08T16:50:00.000Z",
    },
    {
      id: "reply-sols-2b",
      postId: "post-sols-2",
      authorUserId: "user-grace",
      body: "And if retries are obvious. Hidden queues are where trust disappears.",
      createdAt: "2026-04-08T16:53:00.000Z",
    },
    {
      id: "reply-sols-2c",
      postId: "post-sols-2",
      authorUserId: "user-frank",
      body: "I'll add a clean retry path next. No magic, just status plus action.",
      createdAt: "2026-04-08T16:58:00.000Z",
    },
  ],
};

async function seed() {
  const db = getDb();

  console.log("Starting database seed...");

  try {
    // Seed users
    console.log("Seeding users...");
    for (const user of seedData.users) {
      await db
        .insert(users)
        .values({
          id: user.id,
          xUserId: user.xUserId,
          xHandle: user.xHandle,
          displayName: user.displayName,
          avatarUrl: user.avatar,
        })
        .onConflictDoNothing();
    }

    // Seed communities
    console.log("Seeding communities...");
    for (const community of seedData.communities) {
      await db
        .insert(communities)
        .values({
          id: community.id,
          slug: community.slug,
          name: community.name,
          ticker: community.ticker,
          tagline: community.tagline,
          description: community.description,
          rules: community.rules,
          contractAddress: community.contractAddress,
          createdByUserId: community.createdByUserId,
          memberCount: community.memberCount,
          createdAt: new Date(community.createdAt),
        })
        .onConflictDoNothing();
    }

    // Seed memberships
    console.log("Seeding memberships...");
    for (const membership of seedData.memberships) {
      await db
        .insert(communityMemberships)
        .values({
          id: membership.id,
          communityId: membership.communityId,
          userId: membership.userId,
          role: membership.role,
          status: membership.status,
          createdAt: new Date(membership.createdAt),
        })
        .onConflictDoNothing();
    }

    // Seed posts
    console.log("Seeding posts...");
    for (const post of seedData.posts) {
      await db
        .insert(posts)
        .values({
          id: post.id,
          communityId: post.communityId,
          authorUserId: post.authorUserId,
          body: post.body,
          mediaPayload: post.media,
          isPinned: post.isPinned,
          createdAt: new Date(post.createdAt),
        })
        .onConflictDoNothing();
    }

    // Seed replies
    console.log("Seeding post replies...");
    for (const reply of seedData.replies) {
      await db
        .insert(postReplies)
        .values({
          id: reply.id,
          postId: reply.postId,
          authorUserId: reply.authorUserId,
          body: reply.body,
          createdAt: new Date(reply.createdAt),
        })
        .onConflictDoNothing();
    }

    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Database seed failed:", error);
    process.exit(1);
  }
}

seed();
