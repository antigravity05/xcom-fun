export type ImportedMediaKind = "image" | "video";

export interface ImportedMediaItem {
  kind: ImportedMediaKind;
  url: string;
}

export interface PersistedMediaItem extends ImportedMediaItem {
  /**
   * Storage backend used: "passthrough" keeps the source URL (v1, dies
   * when X removes Communities). "r2" copies to our CDN (v2, survives).
   */
  backend: "passthrough" | "r2";
}

interface PersistContext {
  communityId: string;
}

// v1 passthrough — returns the X-hosted URL unchanged. The caller stores
// it on the post; once X deletes Communities on May 6, these URLs will
// 404. Swap this implementation for an R2-backed one to make imports
// survive the deadline.
export async function persistImportedMedia(
  items: ImportedMediaItem[],
  _ctx: PersistContext,
): Promise<PersistedMediaItem[]> {
  return items.map((item) => ({ ...item, backend: "passthrough" }));
}
