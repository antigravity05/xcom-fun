"use client";

import { RefreshCw } from "lucide-react";

export default function CreateCommunityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-soft/10">
          <span className="text-[20px] text-danger-soft">!</span>
        </div>
        <h1 className="mt-4 text-[20px] font-extrabold text-white">
          Could not create community
        </h1>
        <p className="mt-2 text-[14px] leading-5 text-copy-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest ? (
          <p className="mt-1 text-[11px] text-copy-soft">{error.digest}</p>
        ) : null}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-accent-secondary px-5 py-2.5 text-[14px] font-bold text-white transition hover:brightness-110"
          >
            <RefreshCw className="size-3.5" />
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-white/[0.08] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-white/[0.06]"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
