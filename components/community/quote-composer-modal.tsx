"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { quoteRepostAction } from "@/app/xcom-actions";
import { formatRelativeTime } from "@/lib/xcom-formatters";

type QuoteComposerModalProps = {
  postId: string;
  communitySlug: string;
  redirectTo: string;
  quotedPost: {
    authorHandle: string;
    authorName: string;
    authorAvatar?: string;
    body: string;
    createdAt: string;
  };
  viewer?: { displayName: string; avatar?: string } | null;
  onClose: () => void;
};

export function QuoteComposerModal({
  postId,
  communitySlug,
  redirectTo,
  quotedPost,
  viewer,
  onClose,
}: QuoteComposerModalProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const viewerAvatarUrl = viewer?.avatar?.startsWith("http") ? viewer.avatar : null;
  const viewerInitial = viewer?.displayName?.[0]?.toUpperCase() ?? "X";
  const quotedAvatarUrl = quotedPost.authorAvatar?.startsWith("http") ? quotedPost.authorAvatar : null;

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    await quoteRepostAction(formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[600px] rounded-2xl border border-white/10 bg-[#0d0d1a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
          <span className="text-[15px] font-bold text-white">Quote</span>
          <div className="size-8" />
        </div>

        {/* Body */}
        <form ref={formRef} action={handleSubmit} className="p-4">
          <input type="hidden" name="quotedPostId" value={postId} />
          <input type="hidden" name="communitySlug" value={communitySlug} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="flex gap-3">
            {/* Viewer avatar */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-secondary/30 text-sm font-bold text-white overflow-hidden">
              {viewerAvatarUrl ? (
                <img src={viewerAvatarUrl} alt="" className="size-full object-cover" />
              ) : (
                viewerInitial
              )}
            </div>

            <div className="min-w-0 flex-1">
              <textarea
                name="body"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[80px] w-full resize-none border-0 bg-transparent px-0 py-2 text-[17px] leading-6 text-white placeholder:text-copy-soft focus:outline-none"
                placeholder="Add a comment..."
                autoFocus
              />

              {/* Quoted post embed */}
              <div className="mt-2 rounded-2xl border border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white overflow-hidden">
                    {quotedAvatarUrl ? (
                      <img src={quotedAvatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      quotedPost.authorName[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="text-[13px] font-bold text-white">{quotedPost.authorName}</span>
                  <span className="text-[13px] text-copy-muted">{quotedPost.authorHandle}</span>
                  <span className="text-[13px] text-copy-muted">· {formatRelativeTime(quotedPost.createdAt)}</span>
                </div>
                <p className="mt-1 text-[14px] leading-5 text-copy-soft line-clamp-3">
                  {quotedPost.body}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-end border-t border-white/[0.08] pt-3">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className={`rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white transition hover:brightness-110 ${
                submitting || !body.trim() ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
