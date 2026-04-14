"use client";

import { useEffect, useState } from "react";
import { Bug, X, Check, AlertTriangle } from "lucide-react";
import { reportBugAction } from "@/app/xcom-actions";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  // Capture URL + open — grabbed on click so the pageUrl reflects whatever
  // route the user was on at the moment they decided to report.
  const handleOpen = () => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
    setOpen(true);
  };

  // Escape closes modal
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setMessage("");
    setEmail("");
    setState({ kind: "idle" });
  };

  const close = () => {
    setOpen(false);
    // Reset after close animation so user doesn't see content flash
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.kind === "submitting") return;

    const formData = new FormData();
    formData.set("message", message);
    formData.set("email", email);
    formData.set("pageUrl", pageUrl);
    formData.set(
      "userAgent",
      typeof navigator !== "undefined" ? navigator.userAgent : "",
    );

    setState({ kind: "submitting" });
    try {
      const result = await reportBugAction(formData);
      if (result.ok) {
        setState({ kind: "success" });
        setTimeout(close, 1800);
      } else {
        setState({ kind: "error", message: result.error });
      }
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Unexpected error. Try again.",
      });
    }
  };

  const canSubmit = message.trim().length >= 5 && state.kind !== "submitting";

  return (
    <>
      {/* Floating button — sits above mobile bottom nav, lower on desktop */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Report a bug"
        title="Report a bug"
        className="fixed bottom-20 right-4 z-40 flex size-11 items-center justify-center rounded-full border border-white/10 bg-surface-secondary/90 text-copy-soft shadow-lg backdrop-blur transition hover:border-accent-secondary/40 hover:bg-surface-secondary hover:text-white lg:bottom-5 lg:right-5"
      >
        <Bug className="size-5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#0d0d1a] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2">
                <Bug className="size-4 text-accent-secondary" />
                <span className="text-[15px] font-bold text-white">
                  Report a bug
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            {state.kind === "success" ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                <div className="flex size-12 items-center justify-center rounded-full bg-green-500/15">
                  <Check className="size-6 text-green-400" />
                </div>
                <p className="text-[15px] font-bold text-white">Thanks!</p>
                <p className="text-center text-[13px] text-copy-muted">
                  Your report was saved. We&rsquo;ll take a look.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-3 p-4">
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-copy-muted">
                    What went wrong?
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    autoFocus
                    placeholder="Steps to reproduce, what you expected, what actually happened…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-surface-secondary/50 px-3 py-2.5 text-[14px] leading-5 text-white placeholder:text-copy-soft focus:border-accent-secondary/40 focus:outline-none"
                  />
                  <span className="text-right text-[11px] text-copy-soft">
                    {message.length}/5000
                  </span>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-copy-muted">
                    Email{" "}
                    <span className="font-normal normal-case text-copy-soft">
                      (optional, if you want a follow-up)
                    </span>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-surface-secondary/50 px-3 py-2 text-[14px] text-white placeholder:text-copy-soft focus:border-accent-secondary/40 focus:outline-none"
                  />
                </label>

                {pageUrl ? (
                  <div className="grid gap-1">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-copy-soft">
                      Page
                    </span>
                    <div className="truncate rounded-lg bg-white/[0.03] px-2.5 py-1.5 font-mono text-[12px] text-copy-muted">
                      {pageUrl}
                    </div>
                  </div>
                ) : null}

                {state.kind === "error" ? (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
                    <p className="text-[13px] text-red-300">{state.message}</p>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full px-4 py-2 text-[14px] font-bold text-copy-muted transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`rounded-full bg-accent-secondary px-5 py-2 text-[14px] font-bold text-white transition hover:brightness-110 ${
                      !canSubmit ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  >
                    {state.kind === "submitting" ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
