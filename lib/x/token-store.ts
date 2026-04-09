import "server-only";

/**
 * Token storage abstraction.
 * Uses PostgreSQL (xAccounts table) when DATABASE_URL is set,
 * otherwise falls back to filesystem JSON (dev mode).
 */

type StoredTokens = {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
};

// ─── Database storage ───

const getDbTokens = async (userId: string): Promise<StoredTokens | null> => {
  try {
    const { getDb } = await import("@/lib/database/client");

    const db = getDb();
    // Use db.query API (Drizzle's relational query builder) instead of
    // db.select().from().where() which triggers `e.getSQL is not a function`
    // in this Drizzle + postgres-js combo.
    const row = await db.query.xAccounts.findFirst({
      where: (xAccounts, { eq }) => eq(xAccounts.userId, userId),
    });

    if (!row) return null;

    return {
      userId,
      accessToken: row.accessTokenCiphertext,
      refreshToken: row.refreshTokenCiphertext ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? new Date(0).toISOString(),
    };
  } catch (err) {
    console.error("[token-store] DB read failed:", err);
    return null;
  }
};

const saveDbTokens = async (tokens: StoredTokens): Promise<void> => {
  const { getDb } = await import("@/lib/database/client");
  const { xAccounts } = await import("@/drizzle/schema");

  const db = getDb();
  await db
    .insert(xAccounts)
    .values({
      userId: tokens.userId,
      accessTokenCiphertext: tokens.accessToken,
      refreshTokenCiphertext: tokens.refreshToken,
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      expiresAt: new Date(tokens.expiresAt),
    })
    .onConflictDoUpdate({
      target: [xAccounts.userId],
      set: {
        accessTokenCiphertext: tokens.accessToken,
        refreshTokenCiphertext: tokens.refreshToken,
        expiresAt: new Date(tokens.expiresAt),
        updatedAt: new Date(),
      },
    });
};

// ─── Filesystem storage (dev fallback) ───

const getFileTokens = async (userId: string): Promise<StoredTokens | null> => {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    const tokenPath = join(process.cwd(), "data", "user-tokens", `${userId}.json`);
    const content = await readFile(tokenPath, "utf8");
    const data = JSON.parse(content);

    return {
      userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.tokenExpiresAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
};

const saveFileTokens = async (tokens: StoredTokens): Promise<void> => {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const dir = join(process.cwd(), "data", "user-tokens");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${tokens.userId}.json`),
    JSON.stringify(
      {
        userId: tokens.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
};

// ─── Public API ───

const useDatabase = () => Boolean(process.env.DATABASE_URL);

export const getUserTokens = async (
  userId: string,
): Promise<StoredTokens | null> => {
  return useDatabase() ? getDbTokens(userId) : getFileTokens(userId);
};

export const saveUserTokens = async (tokens: StoredTokens): Promise<void> => {
  if (useDatabase()) {
    await saveDbTokens(tokens);
  } else {
    await saveFileTokens(tokens);
  }
};
