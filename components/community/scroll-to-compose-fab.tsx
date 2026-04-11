"use client";

import { PenSquare } from "lucide-react";

/**
 * Floating action button (mobile only) that scrolls to the post composer.
 * If the composer doesn't exist (user not a member), navigates to connect page.
 */
export function ScrollToComposeFab() {
  const handleClick = () => {
    // Try to find and focus the composer textarea
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="body"]'
    );
    if (textarea) {
      textarea.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => textarea.focus(), 400);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent-secondary shadow-lg shadow-accent-secondary/30 text-white transition hover:brightness-110 active:scale-95 lg:hidden"
      aria-label="New post"
    >
      <PenSquare className="size-6" />
    </button>
  );
}
