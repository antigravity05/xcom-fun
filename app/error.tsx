"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        padding: "2rem",
        color: "white",
        background: "#0a0a0a",
        minHeight: "100vh",
        fontFamily: "monospace",
      }}
    >
      <h1 style={{ color: "#ef4444", fontSize: "24px" }}>Something went wrong</h1>
      <p style={{ color: "#fbbf24", marginTop: "1rem" }}>{error.message}</p>
      {error.digest ? (
        <p style={{ color: "#888", marginTop: "0.5rem" }}>Digest: {error.digest}</p>
      ) : null}
      <pre
        style={{
          fontSize: "12px",
          color: "#888",
          whiteSpace: "pre-wrap",
          marginTop: "1rem",
        }}
      >
        {error.stack}
      </pre>
      <button
        onClick={reset}
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 1.5rem",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Try again
      </button>
    </div>
  );
}
