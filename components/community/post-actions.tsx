"use client";

import { useState, useCallback } from "react";
import { Bookmark, Share, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";

/**
 * Bookmark button — toggles a local bookmarked state.
 * Currently visual-only (not persisted), but ready for backend integration.
 */
export const BookmarkButton = () => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setIsBookmarked((prev) => !prev)}
      className={`group/btn flex size-[34px] items-center justify-center rounded-full transition ${
        isBookmarked
          ? "text-accent-secondary"
          : "text-copy-muted hover:text-accent-secondary"
      }`}
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
    >
      <Bookmark
        className={`size-[18px] transition-transform ${
          isBookmarked
            ? "fill-current scale-110"
            : "group-hover/btn:scale-110"
        }`}
      />
    </button>
  );
};

/**
 * Share button — copies the post link to clipboard.
 * Shows a brief checkmark confirmation.
 */
export const ShareButton = ({
  communitySlug,
  postId,
}: {
  communitySlug: string;
  postId: string;
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/communities/${communitySlug}#post-${postId}`;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  }, [communitySlug, postId]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`group/btn flex size-[34px] items-center justify-center rounded-full transition ${
        copied
          ? "text-accent-tertiary"
          : "text-copy-muted hover:text-accent-secondary"
      }`}
      aria-label="Share"
    >
      {copied ? (
        <Check className="size-[18px]" />
      ) : (
        <Share className="size-[18px] transition-transform group-hover/btn:scale-110" />
      )}
    </button>
  );
};
