"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { ReplyModal } from "@/components/community/reply-modal";
import { formatCompactNumber } from "@/lib/xcom-formatters";

type ReplyButtonProps = {
  postId: string;
  communitySlug: string;
  redirectTo: string;
  replyCount: number;
  canInteract: boolean;
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
};

export const ReplyButton = ({
  postId,
  communitySlug,
  redirectTo,
  replyCount,
  canInteract,
  originalPost,
  viewer,
}: ReplyButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (canInteract) setIsModalOpen(true);
        }}
        className={`group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] transition ${
          canInteract
            ? "text-copy-muted hover:text-accent-secondary"
            : "text-copy-muted cursor-default"
        }`}
      >
        <span
          className={`flex size-[34px] items-center justify-center rounded-full transition ${
            canInteract ? "group-hover/btn:bg-accent-secondary/10" : ""
          }`}
        >
          <MessageCircle className="size-[18px]" />
        </span>
        <span className="-ml-1">{formatCompactNumber(replyCount)}</span>
      </button>

      {canInteract ? (
        <ReplyModal
          postId={postId}
          communitySlug={communitySlug}
          redirectTo={redirectTo}
          originalPost={originalPost}
          viewer={viewer}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </>
  );
};
