"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X as CloseIcon } from "lucide-react";
import { isXCommunitiesShutdownActive } from "@/lib/x-communities-deadline";

interface ShareCommunityModalProps {
  isOpen: boolean;
  communitySlug: string;
  communityName: string;
  onClose: () => void;
}

function buildTweetText(slug: string, origin: string): string {
  const url = `${origin}/communities/${slug}`;
  if (isXCommunitiesShutdownActive()) {
    return `🚨 Moving my community before X kills Communities on May 6.

Once it happens, we lose every way to reach each other. Join here:

${url}`;
  }
  return `Just launched my community on x-com.fun — crypto-native, posts auto-sync to X.

Join us:

${url}`;
}

export function ShareCommunityModal({
  isOpen,
  communitySlug,
  communityName,
  onClose,
}: ShareCommunityModalProps) {
  const [copied, setCopied] = useState(false);
  const shutdownActive = isXCommunitiesShutdownActive();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const tweetText = buildTweetText(communitySlug, origin);
  const shareUrl = `${origin}/communities/${communitySlug}`;
  const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently no-op
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-community-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-background p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-copy-muted transition hover:bg-white/[0.06] hover:text-white"
        >
          <CloseIcon className="size-4" />
        </button>

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-secondary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-secondary">
          <Check className="size-3" />
          Live
        </div>
        <h2
          id="share-community-title"
          className="text-[24px] font-extrabold text-white sm:text-[28px]"
        >
          {communityName} is live
        </h2>
        <p className="mt-2 text-[15px] leading-6 text-copy-muted">
          {shutdownActive
            ? "Tell your X members where to find you before May 6 — once X deletes Communities, they can't reach you."
            : "Invite your X followers to join your new community."}
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-surface-secondary/60 p-4">
          <p className="whitespace-pre-wrap text-[14px] leading-6 text-white/90">
            {tweetText}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={intentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-bold text-black transition hover:bg-white/90"
          >
            <span className="text-[18px] font-black">𝕏</span>
            Share on X
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[15px] font-bold text-white transition hover:bg-white/[0.04]"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 block w-full text-center text-[13px] text-copy-soft transition hover:text-white"
        >
          Continue to community →
        </button>
      </div>
    </div>
  );
}
