"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { Image as ImageIcon, X, Smile } from "lucide-react";
import { CharacterCounter } from "@/components/ui/character-counter";
import { toggleBold, toggleItalic } from "@/lib/text-formatters";

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
  /** When true, auto-focuses the textarea on mount (used for modal). */
  autoFocus?: boolean;
  /** Extra classes applied to the <form> root. */
  formClassName?: string;
};

const CHAR_LIMIT = 25000;

export default function PostComposer({
  communitySlug,
  activeTab,
  viewer,
  accentColor,
  coverTo,
  action,
  autoFocus = false,
  formClassName,
}: PostComposerProps) {
  const [body, setBody] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus textarea when mounted inside the modal
  useEffect(() => {
    if (!autoFocus) return;
    const ta = textareaRef.current;
    if (!ta) return;
    // Delay so the modal transition finishes, then focus + move cursor to end
    const id = requestAnimationFrame(() => {
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    });
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const autoGrow = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Clear previous previews
    previews.forEach((p) => URL.revokeObjectURL(p));
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setPreviews([]);
    setVideoPreview(null);
    setMediaError(null);

    const first = files[0];
    if (first.type.startsWith("video/")) {
      if (first.size > 8 * 1024 * 1024) {
        setMediaError("Video must be under 8 MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setVideoPreview(URL.createObjectURL(first));
      return;
    }

    const newPreviews: string[] = [];
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      const file = files[i];
      if (file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
        newPreviews.push(URL.createObjectURL(file));
      }
    }
    setPreviews(newPreviews);
  };

  const clearMedia = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setPreviews([]);
    setVideoPreview(null);
    setMediaError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Apply bold/italic Unicode transform to the current selection inside the
   * textarea. If nothing is selected, transform the whole body instead so a
   * solo click on B/I isn't a no-op.
   */
  const applyFormat = (kind: "bold" | "italic") => {
    const ta = textareaRef.current;
    if (!ta) return;

    const transform = kind === "bold" ? toggleBold : toggleItalic;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;

    let nextBody: string;
    let nextStart: number;
    let nextEnd: number;

    if (start === end) {
      // No selection — transform whole body, keep cursor at end
      nextBody = transform(body);
      nextStart = nextEnd = nextBody.length;
    } else {
      const before = body.slice(0, start);
      const selected = body.slice(start, end);
      const after = body.slice(end);
      const transformed = transform(selected);
      nextBody = `${before}${transformed}${after}`;
      nextStart = start;
      nextEnd = start + [...transformed].reduce(
        (acc, ch) => acc + ch.length,
        0,
      );
    }

    setBody(nextBody);
    // Restore focus + selection after React commits
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(nextStart, nextEnd);
      autoGrow();
    });
  };

  const handleSubmit = async (formData: FormData) => {
    await action(formData);
    previews.forEach((p) => URL.revokeObjectURL(p));
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setPreviews([]);
    setVideoPreview(null);
    setBody("");
    setIsFocused(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (formRef.current) formRef.current.reset();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const viewerAvatarUrl = viewer?.avatar?.startsWith("http") ? viewer.avatar : null;
  const viewerInitial = viewer?.displayName?.[0]?.toUpperCase() ?? "X";
  const isOverLimit = body.length > CHAR_LIMIT;
  const hasMedia = previews.length > 0 || videoPreview !== null;
  const canPost = (body.trim().length > 0 || hasMedia) && !isOverLimit;

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={
        formClassName ??
        "border-b border-white/[0.08] px-3 pb-2.5 pt-3 sm:px-6 sm:pb-3 sm:pt-4"
      }
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
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                if (e.key === "b" || e.key === "B") {
                  e.preventDefault();
                  applyFormat("bold");
                } else if (e.key === "i" || e.key === "I") {
                  e.preventDefault();
                  applyFormat("italic");
                }
              }
            }}
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
                onClick={clearMedia}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Video preview */}
          {videoPreview && (
            <div className="relative mt-2">
              <video
                src={videoPreview}
                controls
                className="w-full max-h-[400px] overflow-hidden rounded-2xl bg-black"
              />
              <button
                type="button"
                onClick={clearMedia}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Media error */}
          {mediaError && (
            <p className="mt-2 text-[13px] text-danger-soft">{mediaError}</p>
          )}

          {/* Toolbar */}
          <div className="mt-1 flex items-center justify-between border-t border-white/[0.08] pt-3">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                id="post-image-upload"
                type="file"
                name="media"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
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
              <button
                type="button"
                className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10"
                title="GIF"
              >
                <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13zM15.5 10.25c0-.41.34-.75.75-.75s.75.34.75.75v3.5c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-3.5zm-4.75-.75c.41 0 .75.34.75.75v3.5c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-3.5c0-.41.34-.75.75-.75zm-3.25.75c0-.41.34-.75.75-.75H9.5c.41 0 .75.34.75.75s-.34.75-.75.75H8.25v.75H9c.41 0 .75.34.75.75s-.34.75-.75.75h-.75v.75c0 .41-.34.75-.75.75s-.75-.34-.75-.75v-3.5z" />
                </svg>
              </button>
              <button
                type="button"
                className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10"
                title="Emoji"
              >
                <Smile className="size-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("bold")}
                title="Bold (Ctrl+B)"
                aria-label="Bold"
                className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10"
              >
                <span className="text-[15px] font-extrabold leading-none">
                  B
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyFormat("italic")}
                title="Italic (Ctrl+I)"
                aria-label="Italic"
                className="flex size-[34px] items-center justify-center rounded-full text-accent-secondary transition hover:bg-accent-secondary/10"
              >
                <span className="font-serif text-[16px] italic leading-none">
                  I
                </span>
              </button>
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
