"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function PostMenu({
  children,
  xTweetUrl,
}: {
  children: React.ReactNode;
  xTweetUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    // Use setTimeout to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleCopyLink = async () => {
    const url = xTweetUrl ?? window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("Copied to clipboard");
    } catch {
      // silent fail
    }
  };

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-[34px] cursor-pointer items-center justify-center rounded-full text-copy-soft transition hover:bg-accent-secondary/10 hover:text-accent-secondary"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-0.5 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg shadow-black/40"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-3 px-4 py-3 text-[15px] text-white transition hover:bg-white/[0.04]"
          >
            <Link2 className="size-[18px] text-copy-muted" />
            Copy link
          </button>
          {children}
        </div>
      ) : null}
    </div>
  );
}
