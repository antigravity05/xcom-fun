"use client";

export default function CommunityError({
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
      <h1 style={{ color: "#ef4444", fontSize: "24px" }}>Community Page Error</h1>
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
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#374151",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
