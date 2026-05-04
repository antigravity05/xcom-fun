import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { communities } from "@/drizzle/schema";
import { validateImportToken } from "@/lib/import-token";
import {
  importTweetsBatchSchema,
  ingestImportedTweets,
} from "@/lib/import-tweets";

const extractBearerToken = (request: NextRequest): string | null => {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization: Bearer token." },
        { status: 401 },
      );
    }

    const ctx = await validateImportToken(token);
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired import token." },
        { status: 401 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = importTweetsBatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    // Defensive recheck: token's community must still exist + token's user
    // must still be the creator. Cheap, prevents stale-token abuse if
    // ownership was transferred.
    const [community] = await getDb()
      .select({
        slug: communities.slug,
        createdByUserId: communities.createdByUserId,
      })
      .from(communities)
      .where(eq(communities.id, ctx.communityId))
      .limit(1);

    if (!community || community.createdByUserId !== ctx.userId) {
      return NextResponse.json(
        { ok: false, error: "Token no longer authorizes this community." },
        { status: 403 },
      );
    }

    const result = await ingestImportedTweets({
      communityId: ctx.communityId,
      batch: parsed.data,
    });

    revalidatePath(`/communities/${community.slug}`);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Import community-tweets error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to ingest tweets.",
      },
      { status: 500 },
    );
  }
}
