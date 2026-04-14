"use client";

import { useEffect, useRef, useState } from "react";
import { PenSquare, X } from "lucide-react";
import PostComposer from "@/components/community/post-composer";

type Viewer = {
  avatar?: string;
  displayName: string;
};

type Props = {
  communitySlug: string;
  communityName: string;
  communityThumbnailUrl?: string | null;
  activeTab: string;
  viewer: Viewer;
  accentColor: string;
  coverTo: string;
  coverFrom: string;
  action: (formData: FormData) => Promise<void>;
};

/**
 * X-style post launcher.
 *
 * Replaces the inline composer with:
 *   1. A compact "What's happening?" trigger bar in the timeline.
 *   2. A floating "+" FAB on mobile.
 *   3. A modal that hosts the full PostComposer when either is clicked.
 *
 * The server action runs a `redirect()` on success, which unmounts the modal
 * via full navigation — no manual close-on-success needed.
 */
export function CommunityComposerLauncher({
  communitySlug,
  communityName,
  communityThumbnailUrl,
  activeTab,
  viewer,
  accentColor,
  coverTo,
  coverFrom,
  action,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const viewerAvatarUrl = viewer?.avatar?.startsWith("http") ? viewer.avatar : null;
  const viewerInitial = viewer?.displayName?.[0]?.toUpperCase() ?? "X";

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Escape to close + focus trap-lite
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  return (
    <>
      {/* ── Inline trigger — mimics X's "What's happening?" bar ── */}
      <button
        type="button"
        onClick={openModal}
        className="group flex w-full items-center gap-3 border-b border-white/[0.08] px-3 py-3 text-left transition hover:bg-white/[0.02] sm:px-6 sm:py-4"
        aria-label="Create a new post"
      >
        {/* Viewer avatar */}
        <span
          className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
          style={
            viewerAvatarUrl
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${coverTo}, ${accentColor})`,
                }
          }
        >
          {viewerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewerAvatarUrl}
              alt={viewer.displayName}
              className="size-full object-cover"
            />
          ) : (
            viewerInitial
          )}
        </span>

        <span className="flex-1 text-[17px] text-copy-soft transition group-hover:text-copy-muted sm:text-[20px]">
          What&apos;s happening?
        </span>

        <span className="pointer-events-none rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white opacity-80 transition group-hover:opacity-100">
          Post
        </span>
      </button>

      {/* ── Mobile FAB ── */}
      <button
        type="button"
        onClick={openModal}
        aria-label="Create a new post"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent-secondary text-white shadow-lg shadow-accent-secondary/30 transition hover:brightness-110 active:scale-95 lg:hidden"
      >
        <PenSquare className="size-6" />
      </button>

      {/* ── Modal ── */}
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-composer-modal-title"
          onMouseDown={(e) => {
            // Close only when click originates on backdrop (not panel)
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
              closeModal();
            }
          }}
        >
          <div
            ref={panelRef}
            className="relative flex min-h-[70vh] w-full flex-col bg-background shadow-2xl sm:min-h-0 sm:w-auto sm:min-w-[600px] sm:max-w-[600px] sm:rounded-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-background/95 px-3 py-2 backdrop-blur sm:rounded-t-2xl">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-full text-white transition hover:bg-white/[0.08]"
              >
                <X className="size-5" />
              </button>
              <span
                id="post-composer-modal-title"
                className="text-[15px] font-semibold text-copy-muted"
              >
                Drafts
              </span>
            </div>

            {/* Community context banner */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 sm:px-5">
              <span
                className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md text-[10px] font-bold text-white"
                style={
                  communityThumbnailUrl
                    ? { backgroundImage: `url(${communityThumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : {
                        background: `linear-gradient(135deg, ${coverFrom}, ${accentColor})`,
                      }
                }
              >
                {communityThumbnailUrl ? null : communityName[0]?.toUpperCase()}
              </span>
              <span className="truncate text-[14px] font-semibold text-white">
                {communityName}
              </span>
            </div>

            {/* Composer — re-uses the exact same form + server action */}
            <div className="flex-1 overflow-y-auto">
              <PostComposer
                communitySlug={communitySlug}
                activeTab={activeTab}
                viewer={viewer}
                accentColor={accentColor}
                coverTo={coverTo}
                action={action}
                autoFocus
                formClassName="px-3 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-3"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
