import "server-only";

import { z } from "zod";
import { inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { posts, users } from "@/drizzle/schema";
import {
  persistImportedMedia,
  type ImportedMediaItem,
} from "@/lib/import-media-storage";

const MAX_TWEETS_PER_BATCH = 100;
const MAX_BODY_LEN = 25_000;

const mediaItemSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().url(),
});

const tweetSchema = z.object({
  externalTweetId: z.string().min(1).max(64),
  authorHandle: z
    .string()
    .min(1)
    .max(64)
    .transform((value) => value.replace(/^@/, "").toLowerCase()),
  authorDisplayName: z.string().min(1).max(128),
  authorAvatarUrl: z.string().url().nullable().optional(),
  body: z.string().max(MAX_BODY_LEN),
  media: z.array(mediaItemSchema).max(10).default([]),
  postedAt: z.string().datetime(),
  likes: z.number().int().nonnegative().nullable().optional(),
  reposts: z.number().int().nonnegative().nullable().optional(),
});

export const importTweetsBatchSchema = z.object({
  tweets: z.array(tweetSchema).min(1).max(MAX_TWEETS_PER_BATCH),
});

export type ImportTweetsBatchInput = z.infer<typeof importTweetsBatchSchema>;
export type ImportedTweet = z.infer<typeof tweetSchema>;

export interface ImportTweetsResult {
  imported: number;
  duplicates: number;
  total: number;
}

/**
 * Inserts a batch of imported X tweets into the posts table.
 * - Auto-links to a x-com.fun user when their X handle matches.
 * - Deduplicates via UNIQUE(community_id, external_tweet_id).
 * - Stores media via the passthrough abstraction (v1: keeps X URLs).
 */
export const ingestImportedTweets = async (args: {
  communityId: string;
  batch: ImportTweetsBatchInput;
}): Promise<ImportTweetsResult> => {
  const { communityId, batch } = args;
  const db = getDb();

  const handles = Array.from(
    new Set(batch.tweets.map((tweet) => tweet.authorHandle.toLowerCase())),
  );

  // Map X handles to existing x-com.fun users for auto-link
  const matchedUsers = handles.length
    ? await db
        .select({ id: users.id, xHandle: users.xHandle })
        .from(users)
        .where(inArray(sql`lower(${users.xHandle})`, handles))
    : [];

  const handleToUserId = new Map<string, string>();
  for (const row of matchedUsers) {
    handleToUserId.set(row.xHandle.toLowerCase(), row.id);
  }

  // Persist media via abstraction (passthrough v1 → R2 in v2)
  const tweetsWithPersistedMedia = await Promise.all(
    batch.tweets.map(async (tweet) => {
      const items: ImportedMediaItem[] = tweet.media.map((m) => ({
        kind: m.kind,
        url: m.url,
      }));
      const persisted = await persistImportedMedia(items, { communityId });
      return { tweet, persisted };
    }),
  );

  const rows = tweetsWithPersistedMedia.map(({ tweet, persisted }) => ({
    communityId,
    authorUserId: handleToUserId.get(tweet.authorHandle.toLowerCase()) ?? null,
    body: tweet.body,
    mediaPayload: persisted.length ? { items: persisted } : null,
    externalTweetId: tweet.externalTweetId,
    externalAuthorHandle: tweet.authorHandle,
    externalAuthorDisplayName: tweet.authorDisplayName,
    externalAuthorAvatarUrl: tweet.authorAvatarUrl ?? null,
    externalEngagementLikes: tweet.likes ?? null,
    externalEngagementReposts: tweet.reposts ?? null,
    externalPostedAt: new Date(tweet.postedAt),
  }));

  const inserted = await db
    .insert(posts)
    .values(rows)
    .onConflictDoNothing({
      target: [posts.communityId, posts.externalTweetId],
    })
    .returning({ id: posts.id });

  return {
    imported: inserted.length,
    duplicates: rows.length - inserted.length,
    total: rows.length,
  };
};

/**
 * Retro-link previously imported ghost posts to a freshly-signed-up user.
 * Called from the OAuth callback when a new x-com.fun account is created.
 */
export const linkImportedPostsToUser = async (args: {
  userId: string;
  xHandle: string;
}): Promise<{ linked: number }> => {
  const result = await getDb()
    .update(posts)
    .set({ authorUserId: args.userId })
    .where(
      sql`${posts.authorUserId} IS NULL AND lower(${posts.externalAuthorHandle}) = lower(${args.xHandle})`,
    )
    .returning({ id: posts.id });

  return { linked: result.length };
};
