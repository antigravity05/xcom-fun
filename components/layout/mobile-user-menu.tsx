"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Coins, LogOut, Users } from "lucide-react";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);
import { disconnectDemoAccountAction } from "@/app/xcom-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

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
          <Link
            href="/my-communities"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-white transition hover:bg-white/[0.06]"
          >
            <Users className="size-4" />
            My Communities
          </Link>
          <a
            href="https://pump.fun/coin/FAuf7ZLmWvYrnvzhZCCJnCqGczxvcZY7c8RokUv2pump"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-bold text-accent-tertiary transition hover:bg-accent-tertiary/10"
          >
            <Coins className="size-4" />
            Buy $XCOM token
          </a>
          <a
            href="https://github.com/antigravity05/xcom-fun"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-white transition hover:bg-white/[0.06]"
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
          <form action={disconnectDemoAccountAction}>
            <input type="hidden" name="redirectTo" value="/" />
            <FormSubmitButton
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] text-red-400 transition hover:bg-white/[0.06]"
              pendingChildren={<><span className="size-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /> Logging out...</>}
            >
              <LogOut className="size-4" />
              Log out
            </FormSubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
