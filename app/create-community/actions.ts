"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewerUserId } from "@/lib/xcom-session";
import { readXcomStore, applyCreateCommunity } from "@/lib/xcom-persistence";

const createCommunityPayloadSchema = z.object({
  name: z.string().min(3).max(32),
  description: z.string().min(10).max(420),
});

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

const makeTaglineFromDescription = (value: string) => {
  return value.trim().slice(0, 90);
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

const storeCommunityBanner = async (file: File, slug: string) => {
  if (!(file instanceof File) || file.size === 0) throw new Error("Banner image is required.");
  if (file.size > maxBannerSizeBytes) throw new Error("Banner image must stay under 5 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectImageExtension(bytes);
  if (!extension) throw new Error("Banner must be a PNG, JPG, WEBP or GIF image.");

  if (process.env.VERCEL || process.env.DATABASE_URL) {
    const mime = mimeForExtension[extension] ?? "application/octet-stream";
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mime};base64,${base64}`;
  }

  const path = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const bannerUploadDirectory = path.join(process.cwd(), "public", "uploads", "community-banners");
  await mkdir(bannerUploadDirectory, { recursive: true });
  const fileName = `${slug}-${randomUUID()}.${extension}`;
  await writeFile(path.join(bannerUploadDirectory, fileName), bytes);
  return `/uploads/community-banners/${fileName}`;
};

export async function createCommunityAction(formData: FormData) {
  const viewerUserId = await getViewerUserId();

  if (!viewerUserId) {
    return { ok: false as const, error: "Connect your X account before creating a community." };
  }

  const parsedPayload = createCommunityPayloadSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!parsedPayload.success) {
    return { ok: false as const, error: parsedPayload.error.issues[0]?.message ?? "Invalid community payload." };
  }

  const snapshot = await readXcomStore();
  const takenSlugs = snapshot.communities.map((e) => e.slug);
  const slug = makeUniqueSlug(slugifyCommunityName(parsedPayload.data.name), takenSlugs);
  const bannerFile = formData.get("banner");

  try {
    if (!(bannerFile instanceof File)) throw new Error("Banner image is required.");
    const bannerUrl = await storeCommunityBanner(bannerFile, slug);

    await applyCreateCommunity({
      actorUserId: viewerUserId,
      slug,
      name: parsedPayload.data.name,
      ticker: makeTickerFromName(parsedPayload.data.name),
      tagline: makeTaglineFromDescription(parsedPayload.data.description),
      description: parsedPayload.data.description,
      bannerUrl,
      rules: ["Stay on topic.", "No spam.", "Keep the feed readable."],
    });
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Unable to save banner image." };
  }

  revalidatePath("/");
  revalidatePath("/create-community");
  return { ok: true as const, slug };
}
