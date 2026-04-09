import type { Metadata } from "next";
import { getViewer } from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "Create community",
};

export default async function CreateCommunityPage() {
  const viewer = await getViewer();

  return (
    <div style={{ padding: "2rem", color: "white", background: "#0a0a0a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "24px" }}>Create Community (debug)</h1>
      <p style={{ marginTop: "1rem" }}>
        Viewer: {viewer ? `${viewer.displayName} (${viewer.xHandle})` : "not logged in"}
      </p>
      <p style={{ marginTop: "0.5rem" }}>
        Viewer ID: {viewer?.id ?? "none"}
      </p>
      <a href="/" style={{ color: "#60a5fa", marginTop: "1rem", display: "inline-block" }}>
        Back to home
      </a>
    </div>
  );
}
