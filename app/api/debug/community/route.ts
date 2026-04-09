import { NextRequest, NextResponse } from "next/server";
import { readXcomStore } from "@/lib/xcom-persistence";
import { getViewerUserId } from "@/lib/xcom-session";

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    const snapshot = await readXcomStore();
    const viewerId = await getViewerUserId();

    const community = snapshot.communities.find((c) => c.slug === slug);
    const posts = snapshot.posts.filter((p) => p.communityId === community?.id);
    const memberships = snapshot.memberships.filter((m) => m.communityId === community?.id);

    return NextResponse.json({
      viewerId,
      communityFound: !!community,
      community: community ? { id: community.id, slug: community.slug, name: community.name, createdByUserId: community.createdByUserId } : null,
      postsCount: posts.length,
      posts: posts.map((p) => ({
        id: p.id,
        authorUserId: p.authorUserId,
        body: p.body?.slice(0, 50),
        createdAt: p.createdAt,
      })),
      membershipsCount: memberships.length,
      memberships: memberships.map((m) => ({
        userId: m.userId,
        role: m.role,
        status: m.status,
      })),
      totalUsers: snapshot.users.length,
      userIds: snapshot.users.map((u) => ({ id: u.id, handle: u.xHandle })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
      { status: 500 },
    );
  }
}
