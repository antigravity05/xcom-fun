"use client";

import { useState, useRef } from "react";
import { Heart } from "lucide-react";
import { toggleLikeAction } from "@/app/xcom-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatCompactNumber } from "@/lib/xcom-formatters";

type LikeButtonProps = {
  postId: string;
  communitySlug: string;
  redirectTo: string;
  likeCount: number;
  viewerHasLiked: boolean;
};

export const LikeButton = ({
  postId,
  communitySlug,
  redirectTo,
  likeCount,
  viewerHasLiked,
}: LikeButtonProps) => {
  const [justLiked, setJustLiked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (!viewerHasLiked) {
      // Trigger the pop animation
      setJustLiked(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setJustLiked(false), 400);
    }
  };

  return (
    <form action={toggleLikeAction} onClick={handleClick}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="communitySlug" value={communitySlug} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <FormSubmitButton
        className={`group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] transition ${
          viewerHasLiked
            ? "text-accent-primary"
            : "text-copy-muted hover:text-accent-primary"
        }`}
      >
        <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-primary/10">
          <Heart
            className={`size-[18px] ${
              viewerHasLiked ? "fill-current" : ""
            } ${justLiked ? "animate-heart-pop" : "transition-transform group-hover/btn:scale-110"}`}
          />
        </span>
        <span className="-ml-1">{formatCompactNumber(likeCount)}</span>
      </FormSubmitButton>
    </form>
  );
};
