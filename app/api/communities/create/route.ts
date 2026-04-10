import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getViewerUserId } from "@/lib/xcom-session";
import { readXcomStore, applyCreateCommunity } from "@/lib/xcom-persistence";

const maxBannerSizeBytes = 5 * 1024 * 1024;

const slugifyCommunityName = (value: string) => {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
};

const makeTickerFromName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const compact = parts
    .slice(0, 4)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
  return (
    compact ||
    value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() ||
    "XCOM"
  ).slice(0, 8);
};

const makeUniqueSlug = (baseSlug: string, takenSlugs: string[]) => {
  const normalizedBase = baseSlug || "community";
  if (!takenSlugs.includes(normalizedBase)) return normalizedBase;
  let counter = 2;
  while (takenSlugs.includes(`${normalizedBase}-${counter}`)) counter += 1;
  return `${normalizedBase}-${counter}`;
};

const detectImageExtension = (bytes: Uint8Array) => {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "gif";
  return null;
};

const mimeForExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function POST(request: NextRequest) {
  try {
    const viewerUserId = await getViewerUserId();

    if (!viewerUserId) {
      return NextResponse.json(
        { ok: false, error: "Connect your X account before creating a community." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const contractAddress = String(formData.get("contractAddress") ?? "").trim() || undefined;

    if (name.length < 3 || name.length > 32) {
      return NextResponse.json(
        { ok: false, error: "Community name must be between 3 and 32 characters." },
        { status: 400 },
      );
    }

    if (description.length < 10 || description.length > 420) {
      return NextResponse.json(
        { ok: false, error: "Description must be between 10 and 420 characters." },
        { status: 400 },
      );
    }

    const snapshot = await readXcomStore();
    const takenSlugs = snapshot.communities.map((e) => e.slug);
    const slug = makeUniqueSlug(slugifyCommunityName(name), takenSlugs);

    // Handle banner
    const bannerFile = formData.get("banner");
    let bannerUrl: string | undefined;

    if (bannerFile instanceof File && bannerFile.size > 0) {
      if (bannerFile.size > maxBannerSizeBytes) {
        return NextResponse.json(
          { ok: false, error: "Banner image must stay under 5 MB." },
          { status: 400 },
        );
      }

      const bytes = new Uint8Array(await bannerFile.arrayBuffer());
      const extension = detectImageExtension(bytes);

      if (!extension) {
        return NextResponse.json(
          { ok: false, error: "Banner must be a PNG, JPG, WEBP or GIF image." },
          { status: 400 },
        );
      }

      const mime = mimeForExtension[extension] ?? "application/octet-stream";
      const base64 = Buffer.from(bytes).toString("base64");
      bannerUrl = `data:${mime};base64,${base64}`;
    }

    await applyCreateCommunity({
      actorUserId: viewerUserId,
      slug,
      name,
      ticker: makeTickerFromName(name),
      tagline: description.slice(0, 90),
      description,
      bannerUrl,
      contractAddress,
      rules: ["Stay on topic.", "No spam.", "Keep the feed readable."],
    });

    revalidatePath("/");
    revalidatePath("/create-community");

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    console.error("Create community error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create community." },
      { status: 500 },
    );
  }
}
