"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

/**
 * A small tooltip/popover that appears when a non-connected user
 * tries to interact with a post. Prompts them to connect X.
 */
type ConnectCTAWrapperProps = {
  children: React.ReactNode;
};

export const ConnectCTAWrapper = ({ children }: ConnectCTAWrapperProps) => {
  const [showCTA, setShowCTA] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!showCTA) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowCTA(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showCTA]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!showCTA) return;
    const timer = setTimeout(() => setShowCTA(false), 4000);
    return () => clearTimeout(timer);
  }, [showCTA]);

  return (
    <div ref={wrapperRef} className="relative">
      <div onClick={() => setShowCTA(true)} className="cursor-pointer">
        {children}
      </div>

      {showCTA ? (
        <div className="absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 animate-[menu-appear_0.15s_ease-out]">
          <div className="whitespace-nowrap rounded-xl border border-white/[0.08] bg-black px-4 py-3 shadow-xl shadow-black/50">
            <div className="text-[13px] font-bold text-white">
              Connect your X account
            </div>
            <div className="mt-1 text-[12px] text-copy-muted">
              to like, reply, and repost
            </div>
            <Link
              href="/connect-x"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-accent-secondary px-4 py-1.5 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              <Zap className="size-3.5" />
              Connect X
            </Link>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 top-full -translate-x-1/2">
            <div className="size-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-black" />
          </div>
        </div>
      ) : null}
    </div>
  );
};
