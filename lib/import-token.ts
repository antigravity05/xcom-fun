import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { importTokens } from "@/drizzle/schema";

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — long enough for big-community imports

const generateOpaqueToken = () => randomBytes(32).toString("base64url");

export interface ImportTokenContext {
  userId: string;
  communityId: string;
}

export const issueImportToken = async (
  ctx: ImportTokenContext,
): Promise<{ token: string; expiresAt: Date }> => {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await getDb().insert(importTokens).values({
    token,
    communityId: ctx.communityId,
    userId: ctx.userId,
    expiresAt,
  });

  return { token, expiresAt };
};

export const validateImportToken = async (
  token: string,
): Promise<ImportTokenContext | null> => {
  if (!token || typeof token !== "string") return null;

  const rows = await getDb()
    .select({
      userId: importTokens.userId,
      communityId: importTokens.communityId,
    })
    .from(importTokens)
    .where(
      and(
        eq(importTokens.token, token),
        gt(importTokens.expiresAt, new Date()),
        isNull(importTokens.revokedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
};

export const revokeImportToken = async (token: string): Promise<void> => {
  await getDb()
    .update(importTokens)
    .set({ revokedAt: new Date() })
    .where(eq(importTokens.token, token));
};
