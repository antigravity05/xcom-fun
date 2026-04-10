import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const communityRoleEnum = pgEnum("community_role", [
  "member",
  "moderator",
  "admin",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "pending",
  "invited",
]);

export const postSyncStatusEnum = pgEnum("post_sync_status", [
  "draft",
  "pending",
  "published",
  "failed",
]);

export const reactionKindEnum = pgEnum("reaction_kind", ["like", "repost"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  xUserId: text("x_user_id").notNull().unique(),
  xHandle: text("x_handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const xAccounts = pgTable(
  "x_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessTokenCiphertext: text("access_token_ciphertext").notNull(),
    refreshTokenCiphertext: text("refresh_token_ciphertext"),
    scopes: text("scopes").array().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUniqueIndex: uniqueIndex("x_accounts_user_id_unique").on(table.userId),
  }),
);

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    ticker: text("ticker").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    rules: text("rules").array().notNull(),
    contractAddress: text("contract_address"),
    avatarUrl: text("avatar_url"),
    bannerUrl: text("banner_url"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    isPublic: boolean("is_public").default(true).notNull(),
    memberCount: integer("member_count").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    creatorIndex: index("communities_created_by_idx").on(table.createdByUserId),
  }),
);

export const communityMemberships = pgTable(
  "community_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: communityRoleEnum("role").default("member").notNull(),
    status: membershipStatusEnum("status").default("active").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    membershipUniqueIndex: uniqueIndex("community_memberships_unique").on(
      table.communityId,
      table.userId,
    ),
    userIndex: index("community_memberships_user_idx").on(table.userId),
  }),
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    mediaPayload: jsonb("media_payload"),
    isPinned: boolean("is_pinned").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    communityTimelineIndex: index("posts_community_created_at_idx").on(
      table.communityId,
      table.createdAt,
    ),
  }),
);

export const postReplies = pgTable(
  "post_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postReplyIndex: index("post_replies_post_created_at_idx").on(
      table.postId,
      table.createdAt,
    ),
  }),
);

export const postReactions = pgTable(
  "post_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: reactionKindEnum("kind").default("like").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    reactionUniqueIndex: uniqueIndex("post_reactions_unique").on(
      table.postId,
      table.userId,
      table.kind,
    ),
  }),
);

export const postPublications = pgTable(
  "post_publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    provider: text("provider").default("x").notNull(),
    status: postSyncStatusEnum("status").default("draft").notNull(),
    externalPostId: text("external_post_id"),
    lastError: text("last_error"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postPublicationUniqueIndex: uniqueIndex("post_publications_post_provider_unique").on(
      table.postId,
      table.provider,
    ),
  }),
);

// ── Relations (required for Drizzle relational query API) ──

export const usersRelations = relations(users, ({ many }) => ({
  xAccounts: many(xAccounts),
  createdCommunities: many(communities, { relationName: "communityCreator" }),
  memberships: many(communityMemberships, { relationName: "memberUser" }),
  invitedMemberships: many(communityMemberships, { relationName: "memberInviter" }),
  posts: many(posts),
  replies: many(postReplies),
  reactions: many(postReactions),
}));

export const xAccountsRelations = relations(xAccounts, ({ one }) => ({
  user: one(users, { fields: [xAccounts.userId], references: [users.id] }),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [communities.createdByUserId],
    references: [users.id],
    relationName: "communityCreator",
  }),
  memberships: many(communityMemberships),
  posts: many(posts),
}));

export const communityMembershipsRelations = relations(communityMemberships, ({ one }) => ({
  community: one(communities, {
    fields: [communityMemberships.communityId],
    references: [communities.id],
  }),
  user: one(users, {
    fields: [communityMemberships.userId],
    references: [users.id],
    relationName: "memberUser",
  }),
  invitedBy: one(users, {
    fields: [communityMemberships.invitedByUserId],
    references: [users.id],
    relationName: "memberInviter",
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
  author: one(users, { fields: [posts.authorUserId], references: [users.id] }),
  replies: many(postReplies),
  reactions: many(postReactions),
  publications: many(postPublications),
}));

export const postRepliesRelations = relations(postReplies, ({ one }) => ({
  post: one(posts, { fields: [postReplies.postId], references: [posts.id] }),
  author: one(users, { fields: [postReplies.authorUserId], references: [users.id] }),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(posts, { fields: [postReactions.postId], references: [posts.id] }),
  user: one(users, { fields: [postReactions.userId], references: [users.id] }),
}));

export const postPublicationsRelations = relations(postPublications, ({ one }) => ({
  post: one(posts, { fields: [postPublications.postId], references: [posts.id] }),
}));
