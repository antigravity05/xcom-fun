"use client";

import { useRef, useState, useCallback } from "react";
import { createReplyAction } from "@/app/xcom-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type ReplyFormProps = {
  postId: string;
  communitySlug: string;
  redirectTo: string;
};

export const ReplyForm = ({ postId, communitySlug, redirectTo }: ReplyFormProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const handleSubmit = async (formData: FormData) => {
    await createReplyAction(formData);
    if (formRef.current) formRef.current.reset();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsFocused(false);
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-2 border-t border-white/[0.06] pt-3"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="communitySlug" value={communitySlug} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="flex gap-2.5">
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            name="body"
            rows={1}
            onFocus={() => setIsFocused(true)}
            onInput={autoGrow}
            className="signal-focus w-full resize-none rounded-2xl border border-white/[0.08] bg-surface-secondary/50 px-4 py-2.5 text-[14px] leading-5 text-white placeholder:text-copy-soft focus:border-accent-secondary/40"
            placeholder="Post your reply..."
          />
        </div>

        {isFocused ? (
          <div className="flex shrink-0 items-end pb-0.5">
            <FormSubmitButton
              className="rounded-full bg-accent-secondary px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-40"
              pendingChildren="..."
            >
              Reply
            </FormSubmitButton>
          </div>
        ) : null}
      </div>
    </form>
  );
};
