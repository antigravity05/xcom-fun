"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  Image as ImageIcon,
  X,
} from "lucide-react";

type PostComposerProps = {
  communitySlug: string;
  activeTab: string;
  viewer: {
    avatar?: string;
    displayName: string;
  };
  accentColor: string;
  coverTo: string;
  action: (formData: FormData) => Promise<void>;
};

export default function PostComposer({
  communitySlug,
  activeTab,
  viewer,
  accentColor,
  coverTo,
  action,
}: PostComposerProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPreviews: string[] = [];
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      const file = files[i];
      if (file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
        newPreviews.push(URL.createObjectURL(file));
      }
    }
    setPreviews(newPreviews);
  };

  const clearImages = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form
      action={action}
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
            <div className="relative mt-2">
              <div
                className={`grid gap-0.5 overflow-hidden rounded-2xl ${
                  previews.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-2"
                }`}
              >
                {previews.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-full object-cover"
                    style={{ maxHeight: previews.length === 1 ? "300px" : "150px" }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={clearImages}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] pt-3">
            <div className="flex items-center gap-0.5">
              {/* Hidden file input — name="images" so it's included in FormData */}
              <input
                ref={fileInputRef}
                id="post-image-upload"
                type="file"
                name="images"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              {/* Label triggers file input via htmlFor — works without JS */}
              <label
                htmlFor="post-image-upload"
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10"
              >
                <ImageIcon className="size-[18px]" />
              </label>
            </div>
            <PostSubmitButton />
          </div>
        </div>
      </div>
    </form>
  );
}

function PostSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white transition hover:brightness-110 ${
        pending ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {pending ? "Posting..." : "Post"}
    </button>
  );
}
