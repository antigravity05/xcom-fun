"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

export function ConnectXButton() {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/x");
      const data = await response.json();

      if (data.authUrl) {
        // Client-side navigation triggers Universal Links (iOS) and App Links (Android)
        // This opens the X app instead of the browser when the app is installed
        window.location.href = data.authUrl;
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-secondary px-6 py-3 text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? (
          <>
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Connecting…
          </>
        ) : (
          <>
            <span className="text-[18px] font-black">𝕏</span>
            Connect with X
          </>
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-copy-soft">
        <Shield className="size-3" />
        OAuth 2.0 PKCE
      </div>
    </div>
  );
}
