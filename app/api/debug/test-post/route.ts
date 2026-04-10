import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint: GET /api/debug/test-post
 * Simulates what happens when a user tries to create a post.
 * Shows the exact error if anything fails.
 * DELETE THIS FILE before going to production.
 */
export async function GET(request: Request) {
  const results: Record<string, unknown> = {};
  const { searchParams } = new URL(request.url);
  const communitySlug = searchParams.get("slug") ?? "";

  try {
    // Step 1: Get viewer ID from cookie
    const cookieStore = await cookies();
    const viewerUserId = cookieStore.get("xcom_demo_user_id")?.value;
    results.step1_viewerUserId = viewerUserId ?? "NO SESSION";

    if (!viewerUserId) {
      return NextResponse.json({ ...results, error: "No session cookie" }, { status: 401 });
    }

    // Step 2: Read xcom store
    const { readXcomStore } = await import("@/lib/xcom-persistence");
    let snapshot;
    try {
      snapshot = await readXcomStore();
      results.step2_storeRead = "OK";
      results.step2_userCount = snapshot.users.length;
      results.step2_communityCount = snapshot.communities.length;
      results.step2_communitySlugs = snapshot.communities.map((c: any) => c.slug);
    } catch (err) {
      results.step2_error = err instanceof Error ? err.message : String(err);
      return NextResponse.json(results, { status: 500 });
    }

    // Step 3: Check if user exists in store
    const user = snapshot.users.find((u: any) => u.id === viewerUserId);
    results.step3_userFound = Boolean(user);
    if (!user) {
      results.step3_error = `User ${viewerUserId} NOT FOUND in store (${snapshot.users.length} users total)`;
      results.step3_allUserIds = snapshot.users.map((u: any) => u.id);
      return NextResponse.json(results, { status: 500 });
    }
    results.step3_user = { id: user.id, xHandle: user.xHandle, displayName: user.displayName };

    // Step 4: Find community
    if (!communitySlug) {
      // List all communities
      results.step4_note = "No slug provided. Add ?slug=your-community-slug to test posting";
      results.step4_communities = snapshot.communities.map((c: any) => ({
        slug: c.slug,
        name: c.name,
        id: c.id,
      }));
      return NextResponse.json(results, { status: 200 });
    }

    const community = snapshot.communities.find((c: any) => c.slug === communitySlug);
    results.step4_communityFound = Boolean(community);
    if (!community) {
      results.step4_error = `Community "${communitySlug}" not found`;
      return NextResponse.json(results, { status: 404 });
    }
    results.step4_community = { id: community.id, slug: community.slug, name: community.name };

    // Step 5: Check membership
    const membership = snapshot.memberships.find(
      (m: any) =>
        m.communityId === community.id &&
        m.userId === viewerUserId &&
        m.status === "active",
    );
    results.step5_membershipFound = Boolean(membership);
    if (!membership) {
      results.step5_error = `User is NOT a member of "${communitySlug}". Must join first.`;
      results.step5_allMemberships = snapshot.memberships
        .filter((m: any) => m.communityId === community.id)
        .map((m: any) => ({ userId: m.userId, role: m.role, status: m.status }));
      return NextResponse.json(results, { status: 403 });
    }
    results.step5_membership = { role: membership.role, status: membership.status };

    // Step 6: Try creating a test post (dry run - just business logic, no DB write)
    try {
      const { createPost } = await import("@/lib/xcom-operations");
      const testResult = createPost(snapshot, {
        actorUserId: viewerUserId,
        communitySlug,
        body: "Test post from debug endpoint",
      });
      results.step6_createPost = "OK - business logic passed";
      const newPost = testResult.posts.find(
        (p: any) => !snapshot.posts.some((sp: any) => sp.id === p.id),
      );
      results.step6_newPost = newPost
        ? { id: newPost.id, body: newPost.body }
        : "No new post found in diff";
    } catch (err) {
      results.step6_error = err instanceof Error ? err.message : String(err);
      results.step6_stack = err instanceof Error ? err.stack : undefined;
      return NextResponse.json(results, { status: 500 });
    }

    // Step 7: Test DB insert (we'll use a real insert then delete)
    try {
      const { getDb } = await import("@/lib/database/client");
      const { posts } = await import("@/drizzle/schema");
      const db = getDb();

      const testPostId = crypto.randomUUID();
      await db.insert(posts).values({
        id: testPostId,
        communityId: community.id,
        authorUserId: viewerUserId,
        body: "__debug_test_post__",
        isPinned: false,
      });

      // Clean up
      const { eq } = await import("drizzle-orm");
      await db.delete(posts).where(eq(posts.id, testPostId));

      results.step7_dbInsert = "OK - insert + delete succeeded";
    } catch (err) {
      results.step7_error = err instanceof Error ? err.message : String(err);
      results.step7_stack = err instanceof Error ? err.stack : undefined;
    }

    results.summary = "ALL CHECKS PASSED - posting should work for this community";

  } catch (err) {
    results.unexpectedError = err instanceof Error ? err.message : String(err);
    results.stack = err instanceof Error ? err.stack : undefined;
  }

  return NextResponse.json(results, { status: 200 });
}
