"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  ListOrdered,
  MapPin,
  Smile,
  X,
} from "lucide-react";
import { createPostAction } from "@/app/xcom-actions";

type PostComposerProps = {
  communitySlug: string;
  activeTab: string;
  viewer: {
    avatar?: string;
    displayName: string;
  };
  accentColor: string;
  coverTo: string;
};

export default function PostComposer({
  communitySlug,
  activeTab,
  viewer,
  accentColor,
  coverTo,
}: PostComposerProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    // Max 4 images total
    const remaining = 4 - files.length;
    const toAdd = Array.from(selected).slice(0, remaining);

    for (const file of toAdd) {
      // Only accept images, max 5MB each
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);

    // Append image files to FormData
    for (const file of files) {
      formData.append("images", file);
    }

    try {
      await createPostAction(formData);
    } catch {
      // redirect throws, which is expected
    } finally {
      setIsSubmitting(false);
      setPreviews([]);
      setFiles([]);
    }
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="border-b border-white/[0.08] px-4 pb-3 pt-4 sm:px-6"
    >
      <input type="hidden" name="communitySlug" value={communitySlug} />
      <input
        type="hidden"
        name="redirectTo"
        value={`/communities/${communitySlug}?tab=${activeTab}`}
      />
      <div className="flex gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white overflow-hidden"
          style={
            viewer?.avatar?.startsWith("http")
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${coverTo}, ${accentColor})`,
                }
          }
        >
          {viewer?.avatar?.startsWith("http") ? (
            <img
              src={viewer.avatar}
              alt={viewer.displayName}
              className="size-full object-cover"
            />
          ) : (
            viewer?.avatar ?? "?"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            name="body"
            rows={2}
            className="signal-focus min-h-[44px] w-full resize-none border-0 bg-transparent px-0 py-2 text-[17px] leading-6 text-white placeholder:text-copy-soft focus:outline-none sm:min-h-[52px] sm:text-[20px] sm:leading-7"
            placeholder="What's happening?"
          />

          {/* Image previews */}
          {previews.length > 0 && (
            <div
              className={`mt-2 grid gap-1 overflow-hidden rounded-2xl ${
                previews.length === 1
                  ? "grid-cols-1"
                  : previews.length === 2
                    ? "grid-cols-2"
                    : previews.length === 3
                      ? "grid-cols-2"
                      : "grid-cols-2"
              }`}
            >
              {previews.map((src, i) => (
                <div
                  key={i}
                  className={`relative ${
                    previews.length === 3 && i === 0
                      ? "row-span-2"
                      : ""
                  }`}
                >
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="h-full w-full object-cover"
                    style={{
                      maxHeight: previews.length === 1 ? "350px" : "175px",
                      minHeight: previews.length === 3 && i === 0 ? "100%" : undefined,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/90"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] pt-3">
            <div className="flex items-center gap-0.5">
              {/* Image upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 4}
                className={`flex size-[34px] items-center justify-center rounded-full transition hover:bg-accent-secondary/10 ${
                  files.length >= 4
                    ? "text-copy-muted cursor-not-allowed"
                    : "text-accent-secondary"
                }`}
              >
                <ImageIcon className="size-[18px]" />
              </button>
              <span className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10">
                <ListOrdered className="size-[18px]" />
              </span>
              <span className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10">
                <Smile className="size-[18px]" />
              </span>
              <span className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10">
                <MapPin className="size-[18px]" />
              </span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white transition hover:brightness-110 ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
