"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="panel-shell max-w-xl rounded-[32px] p-8 text-center sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-soft/10">
          <span className="text-[28px]">!</span>
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-copy-muted">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest ? (
          <p className="mt-2 text-[12px] text-copy-soft">
            Error ID: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-black transition hover:bg-white/90"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
