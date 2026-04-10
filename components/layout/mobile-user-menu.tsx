"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { disconnectDemoAccountAction } from "@/app/xcom-actions";

type MobileUserMenuProps = {
  displayName: string;
  xHandle: string;
  avatarUrl: string | null;
  avatarInitial: string;
};

export function MobileUserMenu({
  displayName,
  xHandle,
  avatarUrl,
  avatarInitial,
}: MobileUserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-8 items-center justify-center rounded-full bg-accent-secondary/20 text-xs font-bold text-white overflow-hidden"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
        ) : (
          avatarInitial
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-2xl border border-white/[0.08] bg-surface-secondary p-2 shadow-xl">
          <Link
            href={`/profile/${encodeURIComponent(xHandle)}`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 border-b border-white/[0.08] mb-1 transition hover:bg-white/[0.04] rounded-xl"
          >
            <div className="text-[14px] font-bold text-white truncate">{displayName}</div>
            <div className="text-[12px] text-copy-muted truncate">{xHandle}</div>
          </Link>
          <form action={disconnectDemoAccountAction}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-red-400 transition hover:bg-white/[0.06]"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
