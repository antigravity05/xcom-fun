import { cookies } from "next/headers";
import { readXcomStore, applyUpdatePost } from "@/lib/xcom-persistence";
import { queueXPublication } from "@/lib/x/publication-contract";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { postId?: string };
    const postId = body.postId;

    if (!postId) {
      return Response.json(
        { error: "Missing postId" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("xcom_demo_user_id")?.value;

    if (!userId) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const snapshot = await readXcomStore();
    const post = snapshot.posts.find((p) => p.id === postId);

    if (!post) {
      return Response.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (post.authorUserId !== userId) {
      return Response.json(
        { error: "Forbidden - only post author can publish" },
        { status: 403 }
      );
    }

    const result = await queueXPublication({
      localPostId: post.id,
      xAccountUserId: userId,
      body: post.body,
    });

    if (result.status === "published") {
      await applyUpdatePost({
        postId: post.id,
        updates: {
          xSyncStatus: "published",
        },
      });
    } else if (result.status === "failed") {
      await applyUpdatePost({
        postId: post.id,
        updates: {
          xSyncStatus: "failed",
        },
      });
    }

    return Response.json({
      status: result.status,
      externalPostId: result.externalPostId,
      error: result.errorMessage,
    });
  } catch (error) {
    console.error("Publish endpoint error:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
