"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { createReplyAction } from "@/app/xcom-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { CharacterCounter } from "@/components/ui/character-counter";
import { useToast } from "@/components/ui/toast";

type ReplyModalProps = {
  postId: string;
  communitySlug: string;
  redirectTo: string;
  originalPost: {
    authorName: string;
    authorHandle: string;
    authorAvatar?: string;
    body: string;
    createdAt: string;
  };
  viewer?: {
    displayName: string;
    avatar?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
};

export const ReplyModal = ({
  postId,
  communitySlug,
  redirectTo,
  originalPost,
  viewer,
  isOpen,
  onClose,
}: ReplyModalProps) => {
  const [body, setBody] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const autoGrow = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
  }, []);

  const handleSubmit = async (formData: FormData) => {
    await createReplyAction(formData);
    setBody("");
    if (formRef.current) formRef.current.reset();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onClose();
    toast("Your reply was sent");
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const viewerAvatarUrl = viewer?.avatar?.startsWith("http") ? viewer.avatar : null;
  const viewerInitial = viewer?.displayName?.[0]?.toUpperCase() ?? "?";
  const authorAvatarUrl = originalPost.authorAvatar?.startsWith("http")
    ? originalPost.authorAvatar
    : null;
  const authorInitial = originalPost.authorName?.[0]?.toUpperCase() ?? "?";

  const charCount = body.length;
  const charLimit = 280;
  const isOverLimit = charCount > charLimit;
  const showCounter = charCount > 0;
  const canReply = body.trim().length > 0 && !isOverLimit;

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-center bg-black/60 backdrop-blur-sm sm:pt-[12vh]"
    >
      {/* Bottom sheet on mobile, centered card on desktop */}
      <div className="relative w-full sm:mx-4 sm:max-w-[600px] animate-slide-up sm:animate-[menu-appear_0.15s_ease-out] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/[0.08] bg-background shadow-2xl shadow-black/60 max-h-[90vh] flex flex-col">
        {/* Drag indicator — mobile only */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* The entire form wraps everything so FormSubmitButton works */}
        <form ref={formRef} action={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="communitySlug" value={communitySlug} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Header with close button + mobile Reply button */}
          <div className="flex items-center justify-between px-4 py-2 sm:py-3">
            <button
              type="button"
              onClick={onClose}
              className="flex size-[34px] items-center justify-center rounded-full transition hover:bg-white/[0.08]"
            >
              <X className="size-5 text-white" />
            </button>
            {/* Mobile reply button in header */}
            <div className="sm:hidden">
              {canReply ? (
                <FormSubmitButton
                  className="rounded-full bg-accent-secondary px-4 py-1.5 text-[14px] font-bold text-white transition hover:brightness-110"
                  pendingChildren="..."
                >
                  Reply
                </FormSubmitButton>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-full bg-accent-secondary px-4 py-1.5 text-[14px] font-bold text-white opacity-40 cursor-not-allowed"
                >
                  Reply
                </button>
              )}
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {/* Original post context */}
            <div className="px-4 pb-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white overflow-hidden">
                    {authorAvatarUrl ? (
                      <img
                        src={authorAvatarUrl}
                        alt={originalPost.authorName}
                        className="size-full object-cover"
                      />
                    ) : (
                      authorInitial
                    )}
                  </div>
                  <div className="mt-1 w-0.5 flex-1 bg-white/[0.12]" />
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex items-center gap-1.5 text-[15px]">
                    <span className="font-bold text-white">{originalPost.authorName}</span>
                    <span className="text-copy-muted">{originalPost.authorHandle}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-line text-[15px] leading-[22px] text-white/[0.93] line-clamp-6">
                    {originalPost.body}
                  </div>
                  <div className="mt-2 text-[14px] text-copy-muted">
                    Replying to{" "}
                    <span className="text-accent-secondary">{originalPost.authorHandle}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reply input */}
            <div className="flex gap-3 px-4 pb-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white overflow-hidden">
                {viewerAvatarUrl ? (
                  <img
                    src={viewerAvatarUrl}
                    alt={viewer?.displayName ?? ""}
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
                  rows={3}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    autoGrow();
                  }}
                  onInput={autoGrow}
                  className="w-full resize-none border-0 bg-transparent py-2 text-[17px] leading-6 sm:text-[20px] sm:leading-7 text-white placeholder:text-copy-soft outline-none"
                  placeholder="Post your reply"
                />
              </div>
            </div>
          </div>

          {/* Desktop footer with counter & submit */}
          <div className="hidden sm:flex items-center justify-between border-t border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-3">
              {showCounter ? (
                <CharacterCounter current={charCount} limit={charLimit} />
              ) : null}
            </div>
            {canReply ? (
              <FormSubmitButton
                className="rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white transition hover:brightness-110"
                pendingChildren="Posting..."
              >
                Reply
              </FormSubmitButton>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white opacity-40 cursor-not-allowed"
              >
                Reply
              </button>
            )}
          </div>

          {/* Mobile footer — just the counter */}
          {showCounter ? (
            <div className="flex sm:hidden items-center border-t border-white/[0.08] px-4 py-2">
              <CharacterCounter current={charCount} limit={charLimit} />
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};
