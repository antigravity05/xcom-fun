"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  /**
   * Wrapped page tree. The launcher needs to enclose both the XcomChrome
   * sidebar (where <CommunityComposerSidebarButton /> lives) and the page body,
   * so the shared context can reach the trigger button.
   */
  children: React.ReactNode;
};

type ComposerContextValue = { open: () => void };
const ComposerCtx = createContext<ComposerContextValue | null>(null);

/**
 * X-style post launcher.
 *
 * Wraps the page tree and provides:
 *   1. A context so <CommunityComposerSidebarButton /> (rendered in the
 *      sidebar via XcomChrome's `postTrigger` prop) can open the modal.
 *   2. A mobile FAB at bottom-right (sidebar is hidden on mobile).
 *   3. The modal itself, hosting PostComposer.
 *
 * The server action calls `redirect()` on success, which unmounts the modal
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
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Escape to close
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

  const ctxValue = useMemo<ComposerContextValue>(
    () => ({ open: openModal }),
    [],
  );

  return (
    <ComposerCtx.Provider value={ctxValue}>
      {children}

      {/* ── Mobile FAB — sidebar is hidden on mobile, so we need a separate
          trigger here. ── */}
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
                    ? {
                        backgroundImage: `url(${communityThumbnailUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
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
    </ComposerCtx.Provider>
  );
}

/**
 * "Post" button for the desktop sidebar. Mimics X's Post button — sits in the
 * left nav, opens the composer modal. Hidden on mobile (mobile uses the FAB).
 *
 * Must be rendered inside a <CommunityComposerLauncher> subtree.
 */
export function CommunityComposerSidebarButton() {
  const ctx = useContext(ComposerCtx);
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={ctx.open}
      aria-label="Create a new post"
      className="mt-4 hidden size-[50px] items-center justify-center rounded-full bg-accent-secondary text-white transition hover:brightness-110 lg:flex xl:size-auto xl:gap-3 xl:px-6 xl:py-3.5"
    >
      <PenSquare className="size-5 xl:hidden" />
      <span className="hidden text-[17px] font-bold xl:block">Post</span>
    </button>
  );
}
