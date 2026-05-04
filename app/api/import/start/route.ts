import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getViewerUserId } from "@/lib/xcom-session";
import { getDb } from "@/lib/database/client";
import { communities } from "@/drizzle/schema";
import { issueImportToken } from "@/lib/import-token";

interface StartRequestBody {
  communitySlug?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const viewerUserId = await getViewerUserId();
    if (!viewerUserId) {
      return NextResponse.json(
        { ok: false, error: "Sign in with X to start an import." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as StartRequestBody | null;
    const slug = typeof body?.communitySlug === "string" ? body.communitySlug.trim() : "";

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "communitySlug is required." },
        { status: 400 },
      );
    }

    const [community] = await getDb()
      .select({
        id: communities.id,
        createdByUserId: communities.createdByUserId,
      })
      .from(communities)
      .where(eq(communities.slug, slug))
      .limit(1);

    if (!community) {
      return NextResponse.json(
        { ok: false, error: "Community not found." },
        { status: 404 },
      );
    }

    if (community.createdByUserId !== viewerUserId) {
      return NextResponse.json(
        { ok: false, error: "Only the community creator can start an import." },
        { status: 403 },
      );
    }

    const { token, expiresAt } = await issueImportToken({
      userId: viewerUserId,
      communityId: community.id,
    });

    return NextResponse.json({
      ok: true,
      token,
      expiresAt: expiresAt.toISOString(),
      communityId: community.id,
    });
  } catch (error) {
    console.error("Import start error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to start import.",
      },
      { status: 500 },
    );
  }
}
