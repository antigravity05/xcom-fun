import { NextResponse } from "next/server";
import { getDb } from "@/lib/database/client";

export async function GET() {
  try {
    const db = getDb();

    // Check if user has tokens stored
    const xAccounts = await db.query.xAccounts.findMany();
    const tokenSummary = xAccounts.map((account) => ({
      userId: account.userId,
      hasAccessToken: Boolean(account.accessTokenCiphertext),
      hasRefreshToken: Boolean(account.refreshTokenCiphertext),
      expiresAt: account.expiresAt?.toISOString() ?? null,
      isExpired: account.expiresAt ? new Date() > account.expiresAt : null,
      scopes: account.scopes,
    }));

    // Check post publications
    const publications = await db.query.postPublications.findMany();
    const pubSummary = publications.map((pub) => ({
      postId: pub.postId,
      provider: pub.provider,
      status: pub.status,
      externalPostId: pub.externalPostId,
      lastError: pub.lastError,
      attemptCount: pub.attemptCount,
      lastAttemptAt: pub.lastAttemptAt?.toISOString() ?? null,
    }));

    // Check env vars presence (not values)
    const envCheck = {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      X_CLIENT_ID: Boolean(process.env.X_CLIENT_ID),
      X_CLIENT_SECRET: Boolean(process.env.X_CLIENT_SECRET),
      X_CALLBACK_URL: process.env.X_CALLBACK_URL ?? null,
      TOKEN_ENCRYPTION_KEY: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    };

    return NextResponse.json({
      ok: true,
      tokenAccounts: tokenSummary,
      publications: pubSummary,
      envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
