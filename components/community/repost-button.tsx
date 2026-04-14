"use client";

import { useState, useRef, useEffect } from "react";
import { Repeat2, Pencil } from "lucide-react";
import { toggleRepostAction } from "@/app/xcom-actions";
import { formatCompactNumber } from "@/lib/xcom-formatters";
import { QuoteComposerModal } from "./quote-composer-modal";

type RepostButtonProps = {
  postId: string;
  communitySlug: string;
  redirectTo: string;
  repostCount: number;
  viewerHasReposted: boolean;
  quotedPost: {
    authorHandle: string;
    authorName: string;
    authorAvatar?: string;
    body: string;
    createdAt: string;
  };
  viewer?: { displayName: string; avatar?: string } | null;
};

export function RepostButton({
  postId,
  communitySlug,
  redirectTo,
  repostCount,
  viewerHasReposted,
  quotedPost,
  viewer,
}: RepostButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className={`group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] transition ${
            viewerHasReposted
              ? "text-accent-tertiary"
              : "text-copy-muted hover:text-accent-tertiary"
          }`}
        >
          <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-tertiary/10">
            <Repeat2 className="size-[18px]" />
          </span>
          <span className="-ml-1">{formatCompactNumber(repostCount)}</span>
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-0 z-50 mb-1 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a2e] shadow-xl">
            <form action={toggleRepostAction}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="communitySlug" value={communitySlug} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-bold text-white transition hover:bg-white/5"
                onClick={() => setShowMenu(false)}
              >
                <Repeat2 className="size-[18px]" />
                Repost
              </button>
            </form>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-bold text-white transition hover:bg-white/5"
              onClick={() => {
                setShowMenu(false);
                setShowQuoteModal(true);
              }}
            >
              <Pencil className="size-[18px]" />
              Quote
            </button>
          </div>
        )}
      </div>

      {showQuoteModal && (
        <QuoteComposerModal
          postId={postId}
          communitySlug={communitySlug}
          redirectTo={redirectTo}
          quotedPost={quotedPost}
          viewer={viewer}
          onClose={() => setShowQuoteModal(false)}
        />
      )}
    </>
  );
}
