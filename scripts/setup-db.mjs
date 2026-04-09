/**
 * Standalone DB setup script — creates all tables and seeds demo data.
 * Usage: DATABASE_URL="..." node scripts/setup-db.mjs
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const mod = require("../node_modules/postgres/src/index.js");
const postgres = mod.default || mod;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function createSchema() {
  console.log("Creating enums...");

  await sql`DO $$ BEGIN
    CREATE TYPE community_role AS ENUM ('member', 'moderator', 'admin');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'pending', 'invited');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE post_sync_status AS ENUM ('draft', 'pending', 'published', 'failed');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

  await sql`DO $$ BEGIN
    CREATE TYPE reaction_kind AS ENUM ('like');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

  console.log("Creating tables...");

  await sql`CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    x_user_id TEXT NOT NULL UNIQUE,
    x_handle TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS x_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token_ciphertext TEXT NOT NULL,
    refresh_token_ciphertext TEXT,
    scopes TEXT[] NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS x_accounts_user_id_unique ON x_accounts(user_id)`;

  await sql`CREATE TABLE IF NOT EXISTS communities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    rules TEXT[] NOT NULL,
    contract_address TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    member_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS communities_created_by_idx ON communities(created_by_user_id)`;

  await sql`CREATE TABLE IF NOT EXISTS community_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role community_role DEFAULT 'member' NOT NULL,
    status membership_status DEFAULT 'active' NOT NULL,
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS community_memberships_unique ON community_memberships(community_id, user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS community_memberships_user_idx ON community_memberships(user_id)`;

  await sql`CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    media_payload JSONB,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS posts_community_created_at_idx ON posts(community_id, created_at)`;

  await sql`CREATE TABLE IF NOT EXISTS post_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS post_replies_post_created_at_idx ON post_replies(post_id, created_at)`;

  await sql`CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind reaction_kind DEFAULT 'like' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_unique ON post_reactions(post_id, user_id, kind)`;

  await sql`CREATE TABLE IF NOT EXISTS post_publications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'x' NOT NULL,
    status post_sync_status DEFAULT 'draft' NOT NULL,
    external_post_id TEXT,
    last_error TEXT,
    attempt_count INTEGER DEFAULT 0 NOT NULL,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS post_publications_post_provider_unique ON post_publications(post_id, provider)`;

  console.log("All tables created.");
}

async function seedData() {
  console.log("Seeding demo data...");

  // Users
  const usersData = [
    { id: "a0000000-0000-0000-0000-000000000001", xUserId: "x-ahmed", xHandle: "@ahmedx", displayName: "Ahmed", avatar: "AH" },
    { id: "a0000000-0000-0000-0000-000000000002", xUserId: "x-shuvonsec", xHandle: "@shuvonsec", displayName: "Shuvonsec", avatar: "S" },
    { id: "a0000000-0000-0000-0000-000000000003", xUserId: "x-meatsos", xHandle: "@SpaceOutJim", displayName: "MeatSOS", avatar: "M" },
    { id: "a0000000-0000-0000-0000-000000000004", xUserId: "x-rdbotato", xHandle: "@rdbotato", displayName: "rdbotato", avatar: "R" },
    { id: "a0000000-0000-0000-0000-000000000005", xUserId: "x-kaka", xHandle: "@Kaka", displayName: "Kaka", avatar: "K" },
    { id: "a0000000-0000-0000-0000-000000000006", xUserId: "x-marin", xHandle: "@marinbuilds", displayName: "Marin", avatar: "M" },
    { id: "a0000000-0000-0000-0000-000000000007", xUserId: "x-aya", xHandle: "@ayaops", displayName: "Aya", avatar: "A" },
  ];

  for (const u of usersData) {
    await sql`INSERT INTO users (id, x_user_id, x_handle, display_name, avatar_url)
      VALUES (${u.id}, ${u.xUserId}, ${u.xHandle}, ${u.displayName}, ${u.avatar})
      ON CONFLICT (id) DO NOTHING`;
  }
  console.log(`  ${usersData.length} users`);

  // Communities
  const communitiesData = [
    {
      id: "b0000000-0000-0000-0000-000000000001",
      slug: "claude-bug-bounty", name: "Claude Bug Bounty", ticker: "$BUG",
      tagline: "Alpha, audits and public receipts for builder-led communities.",
      description: "A public signal room for security-first crypto builders. Members discuss launches, bug bounties, treasury moves and post them fast enough to hit both the community feed and their own X profile.",
      rules: ["Bring signals with context, not one-line shilling.", "If you post a thesis, back it with execution or data.", "No wallet-draining links, fake mint pages or impersonation."],
      contractAddress: "0x7b9e31277b4e5f64a402d9fe7ffef8c98d101e07",
      createdBy: "a0000000-0000-0000-0000-000000000002", memberCount: 3,
    },
    {
      id: "b0000000-0000-0000-0000-000000000002",
      slug: "opus", name: "OPUS", ticker: "$OPUS",
      tagline: "Autonomous AI agents, memecoin velocity and public trade chatter.",
      description: "OPUS is where agent-native meme projects keep the timeline hot. Every post lives inside the community, then fans out through each poster's own X account for maximum reach.",
      rules: ["Posts must stay relevant to OPUS or adjacent agent plays.", "No fake fills, no deleted-entry screenshots.", "Use the community to coordinate, not to spam."],
      contractAddress: "7q0neP3fF1a7f1hK2k3x9bg8PPo9NAz1r22R1pudump",
      createdBy: "a0000000-0000-0000-0000-000000000004", memberCount: 2,
    },
    {
      id: "b0000000-0000-0000-0000-000000000003",
      slug: "solstice-labs", name: "Solstice Labs", ticker: "$SOLS",
      tagline: "Launch coordination, liquidity campaigns and daily ship logs.",
      description: "A calmer command deck for token teams that want the familiarity of X Communities with tighter information architecture and reliable content syndication.",
      rules: ["Ship logs beat hype threads.", "Metrics over mood.", "Respect the feed density. Post clean, then iterate in replies."],
      contractAddress: "0x85ad93797cb57f816214e356ac4dd8b0fdbe4a82",
      createdBy: "a0000000-0000-0000-0000-000000000006", memberCount: 2,
    },
  ];

  for (const c of communitiesData) {
    await sql`INSERT INTO communities (id, slug, name, ticker, tagline, description, rules, contract_address, created_by_user_id, member_count)
      VALUES (${c.id}, ${c.slug}, ${c.name}, ${c.ticker}, ${c.tagline}, ${c.description}, ${c.rules}, ${c.contractAddress}, ${c.createdBy}, ${c.memberCount})
      ON CONFLICT (id) DO NOTHING`;
  }
  console.log(`  ${communitiesData.length} communities`);

  // Memberships
  const memberships = [
    { id: "c0000000-0000-0000-0000-000000000001", communityId: "b0000000-0000-0000-0000-000000000001", userId: "a0000000-0000-0000-0000-000000000002", role: "admin" },
    { id: "c0000000-0000-0000-0000-000000000002", communityId: "b0000000-0000-0000-0000-000000000001", userId: "a0000000-0000-0000-0000-000000000003", role: "member" },
    { id: "c0000000-0000-0000-0000-000000000003", communityId: "b0000000-0000-0000-0000-000000000001", userId: "a0000000-0000-0000-0000-000000000001", role: "member" },
    { id: "c0000000-0000-0000-0000-000000000004", communityId: "b0000000-0000-0000-0000-000000000002", userId: "a0000000-0000-0000-0000-000000000004", role: "admin" },
    { id: "c0000000-0000-0000-0000-000000000005", communityId: "b0000000-0000-0000-0000-000000000002", userId: "a0000000-0000-0000-0000-000000000005", role: "member" },
    { id: "c0000000-0000-0000-0000-000000000006", communityId: "b0000000-0000-0000-0000-000000000003", userId: "a0000000-0000-0000-0000-000000000006", role: "admin" },
    { id: "c0000000-0000-0000-0000-000000000007", communityId: "b0000000-0000-0000-0000-000000000003", userId: "a0000000-0000-0000-0000-000000000007", role: "member" },
  ];

  for (const m of memberships) {
    await sql`INSERT INTO community_memberships (id, community_id, user_id, role, status)
      VALUES (${m.id}, ${m.communityId}, ${m.userId}, ${m.role}::community_role, 'active'::membership_status)
      ON CONFLICT (community_id, user_id) DO NOTHING`;
  }
  console.log(`  ${memberships.length} memberships`);

  // Posts
  const postsData = [
    {
      id: "d0000000-0000-0000-0000-000000000001",
      communityId: "b0000000-0000-0000-0000-000000000001",
      authorId: "a0000000-0000-0000-0000-000000000002",
      body: "I've bought back 1% of the supply and locked it for 3 months. I'm committed to this community and building for the long term.\n\nMore buybacks, locks and burns are coming. Stay tuned.\n\n$Bug is here to stay.",
      isPinned: true,
    },
    {
      id: "d0000000-0000-0000-0000-000000000002",
      communityId: "b0000000-0000-0000-0000-000000000001",
      authorId: "a0000000-0000-0000-0000-000000000003",
      body: "Full stacked Dev building, community's growing, holders are increasing...\n\nYou're early.\n\n$Bug higher.",
      isPinned: false,
    },
    {
      id: "d0000000-0000-0000-0000-000000000003",
      communityId: "b0000000-0000-0000-0000-000000000002",
      authorId: "a0000000-0000-0000-0000-000000000004",
      body: "Only $OPUS.\n\nAgent-native execution matters more than narrative. Use this room for concrete entries, treasury actions and launch timing.",
      isPinned: true,
    },
    {
      id: "d0000000-0000-0000-0000-000000000004",
      communityId: "b0000000-0000-0000-0000-000000000002",
      authorId: "a0000000-0000-0000-0000-000000000005",
      body: "Hey bros, who's printing?\n\nUse replies for live entries, not the main feed.",
      isPinned: false,
    },
    {
      id: "d0000000-0000-0000-0000-000000000005",
      communityId: "b0000000-0000-0000-0000-000000000003",
      authorId: "a0000000-0000-0000-0000-000000000006",
      body: "Ship log for today:\n\n- brand pass approved\n- creator waitlist open\n- X sync worker split from compose request path\n\nThis is exactly the kind of boring infrastructure that lets us move faster next week.",
      isPinned: false,
    },
    {
      id: "d0000000-0000-0000-0000-000000000006",
      communityId: "b0000000-0000-0000-0000-000000000003",
      authorId: "a0000000-0000-0000-0000-000000000007",
      body: "If the product promise is 'post locally and distribute to X', then failed sync states need to be first-class UX.\n\nDon't hide operational truth from users.",
      isPinned: false,
    },
  ];

  for (const p of postsData) {
    await sql`INSERT INTO posts (id, community_id, author_user_id, body, is_pinned)
      VALUES (${p.id}, ${p.communityId}, ${p.authorId}, ${p.body}, ${p.isPinned})
      ON CONFLICT (id) DO NOTHING`;
  }
  console.log(`  ${postsData.length} posts`);

  // Replies
  const repliesData = [
    { id: "e0000000-0000-0000-0000-000000000001", postId: "d0000000-0000-0000-0000-000000000001", authorId: "a0000000-0000-0000-0000-000000000003", body: "Lock looks clean. This is the kind of update people can verify fast." },
    { id: "e0000000-0000-0000-0000-000000000002", postId: "d0000000-0000-0000-0000-000000000001", authorId: "a0000000-0000-0000-0000-000000000002", body: "More receipts coming. I want every major move logged here first." },
    { id: "e0000000-0000-0000-0000-000000000003", postId: "d0000000-0000-0000-0000-000000000001", authorId: "a0000000-0000-0000-0000-000000000003", body: "That makes distribution updates way easier to trust." },
    { id: "e0000000-0000-0000-0000-000000000004", postId: "d0000000-0000-0000-0000-000000000001", authorId: "a0000000-0000-0000-0000-000000000002", body: "Exactly. Less narrative, more onchain proof." },
    { id: "e0000000-0000-0000-0000-000000000005", postId: "d0000000-0000-0000-0000-000000000002", authorId: "a0000000-0000-0000-0000-000000000002", body: "Keep posting updates like this in replies as the holder count moves." },
    { id: "e0000000-0000-0000-0000-000000000006", postId: "d0000000-0000-0000-0000-000000000005", authorId: "a0000000-0000-0000-0000-000000000007", body: "Good split. The compose path should stay fast even when X is slow." },
    { id: "e0000000-0000-0000-0000-000000000007", postId: "d0000000-0000-0000-0000-000000000005", authorId: "a0000000-0000-0000-0000-000000000006", body: "That was the goal. Failures need to degrade gracefully, not block the feed." },
    { id: "e0000000-0000-0000-0000-000000000008", postId: "d0000000-0000-0000-0000-000000000006", authorId: "a0000000-0000-0000-0000-000000000006", body: "Agreed. People tolerate failure states if the app is explicit about them." },
  ];

  for (const r of repliesData) {
    await sql`INSERT INTO post_replies (id, post_id, author_user_id, body)
      VALUES (${r.id}, ${r.postId}, ${r.authorId}, ${r.body})
      ON CONFLICT (id) DO NOTHING`;
  }
  console.log(`  ${repliesData.length} replies`);

  console.log("Seed complete!");
}

async function main() {
  try {
    await createSchema();
    await seedData();

    // Verify
    const userCount = await sql`SELECT count(*) FROM users`;
    const communityCount = await sql`SELECT count(*) FROM communities`;
    const postCount = await sql`SELECT count(*) FROM posts`;
    console.log(`\nVerification: ${userCount[0].count} users, ${communityCount[0].count} communities, ${postCount[0].count} posts`);

    console.log("\nDatabase is ready!");
  } catch (err) {
    console.error("Setup failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
