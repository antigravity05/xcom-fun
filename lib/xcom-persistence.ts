import "server-only";

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
const getFileStorePaths = async () => {
  const path = await import("node:path");
  const dataDirectory = path.join(process.cwd(), "data");
  const storeFilePath = path.join(dataDirectory, "xcom-store.json");
  return { dataDirectory, storeFilePath };
};

/** Empty initial snapshot — used only as fallback for local dev (JSON file store). */
export const initialStoreSnapshot: XcomStoreSnapshot = {
  users: [],
  communities: [],
  memberships: [],
  posts: [],
  replies: [],
  reactions: [],
};

const ensureStoreFile = async () => {
  const { mkdir, readFile, writeFile } = await import("node:fs/promises");
  const { dataDirectory, storeFilePath } = await getFileStorePaths();
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
  const { storeFilePath } = await getFileStorePaths();
  const content = await readFile(storeFilePath, "utf8");
  return JSON.parse(content) as XcomStoreSnapshot;
};

/**
 * Alias for readXcomStore used by read-model layer.
 * React's cache() in db-persistence.ts already deduplicates within a single request.
 * unstable_cache was removed because updateTag() in Next.js 16 does not reliably
 * invalidate unstable_cache entries, causing stale data after mutations.
 */
export const cachedReadXcomStore = readXcomStore;

const writeXcomStore = async (snapshot: XcomStoreSnapshot) => {
  const { writeFile } = await import("node:fs/promises");
  const { storeFilePath } = await getFileStorePaths();
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
