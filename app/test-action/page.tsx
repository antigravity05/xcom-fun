import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test action import",
};

// Minimal client component that imports the server action
import { TestForm } from "./test-form";

export default function TestActionPage() {
  return (
    <div style={{ padding: "2rem", color: "white", background: "#0a0a0a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "24px" }}>Test: Client component with server action</h1>
      <TestForm />
      <a href="/" style={{ color: "#60a5fa", marginTop: "1rem", display: "inline-block" }}>
        Back to home
      </a>
    </div>
  );
}
