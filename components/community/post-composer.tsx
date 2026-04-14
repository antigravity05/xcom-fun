"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { Image as ImageIcon, X } from "lucide-react";
import { CharacterCounter } from "@/components/ui/character-counter";

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

const CHAR_LIMIT = 25000;

export default function PostComposer({
  communitySlug,
  activeTab,
  viewer,
  accentColor,
  coverTo,
  action,
}: PostComposerProps) {
  const [body, setBody] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoGrow = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  }, []);

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

  const handleSubmit = async (formData: FormData) => {
    await action(formData);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews([]);
    setBody("");
    setIsFocused(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (formRef.current) formRef.current.reset();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const viewerAvatarUrl = viewer?.avatar?.startsWith("http") ? viewer.avatar : null;
  const viewerInitial = viewer?.displayName?.[0]?.toUpperCase() ?? "X";
  const isOverLimit = body.length > CHAR_LIMIT;
  const canPost = body.trim().length > 0 && !isOverLimit;

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="border-b border-white/[0.08] px-3 pb-2.5 pt-3 sm:px-6 sm:pb-3 sm:pt-4"
    >
      <input type="hidden" name="communitySlug" value={communitySlug} />
      <input
        type="hidden"
        name="redirectTo"
        value={`/communities/${communitySlug}?tab=${activeTab}`}
      />
      <div className="flex gap-3">
        {/* Viewer avatar */}
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white overflow-hidden"
          style={
            viewerAvatarUrl
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${coverTo}, ${accentColor})`,
                }
          }
        >
          {viewerAvatarUrl ? (
            <img
              src={viewerAvatarUrl}
              alt={viewer.displayName}
              className="size-full object-cover"
            />
          ) : (
            viewerInitial
          )}
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            name="body"
            rows={isFocused ? 3 : 1}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              autoGrow();
            }}
            onFocus={() => setIsFocused(true)}
            onInput={autoGrow}
            className="signal-focus min-h-[44px] w-full resize-none border-0 bg-transparent px-0 py-2 text-[17px] leading-6 text-white placeholder:text-copy-soft focus:outline-none sm:min-h-[52px] sm:text-[20px] sm:leading-7"
            placeholder="What's happening?"
          />

          {/* Image previews */}
          {previews.length > 0 && (
            <div className="relative mt-2">
              <div
                className={`grid gap-0.5 overflow-hidden rounded-2xl ${
                  previews.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {previews.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-full object-cover"
                    style={{
                      maxHeight: previews.length === 1 ? "300px" : "150px",
                    }}
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

          {/* Toolbar */}
          <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] pt-3">
            <div className="flex items-center gap-0.5">
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
              <label
                htmlFor="post-image-upload"
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10"
              >
                <ImageIcon className="size-[18px]" />
              </label>
            </div>

            <div className="flex items-center gap-3">
              {/* Character counter */}
              {body.length > 0 && (
                <div className="flex items-center gap-2">
                  <CharacterCounter current={body.length} limit={CHAR_LIMIT} />
                  {/* Separator */}
                  <div className="h-6 w-px bg-white/[0.12]" />
                </div>
              )}
              <PostSubmitButton canPost={canPost} />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function PostSubmitButton({ canPost }: { canPost: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !canPost}
      className={`rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white transition hover:brightness-110 ${
        pending || !canPost ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {pending ? "Posting..." : "Post"}
    </button>
  );
}
