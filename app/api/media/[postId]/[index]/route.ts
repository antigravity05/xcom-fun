export const dynamic = "force-dynamic";

/**
 * Serves a post image as a binary response.
 * URL: /api/media/{postId}/{index}
 *
 * Lets us give Zernio a public URL for images stored as base64 in the DB.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string; index: string }> },
) {
  const { postId, index: indexStr } = await params;
  const index = parseInt(indexStr, 10);

  if (!postId || isNaN(index) || index < 0 || index > 3) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const { getDb } = await import("@/lib/database/client");
    const { posts } = await import("@/drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const db = getDb();
    const rows = await db
      .select({ mediaPayload: posts.mediaPayload })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    const row = rows[0];

    if (!row?.mediaPayload) {
      return new Response("Not found", { status: 404 });
    }

    const media = row.mediaPayload as { kind?: string; urls?: string[] };

    if (media.kind !== "images" || !media.urls || !media.urls[index]) {
      return new Response("Not found", { status: 404 });
    }

    const dataUrl = media.urls[index];

    // Parse data URL: data:image/jpeg;base64,/9j/4AAQ...
    const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);

    if (!match) {
      return new Response("Invalid image data", { status: 500 });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[api/media] Error serving image:", err);
    return new Response("Internal error", { status: 500 });
  }
}
