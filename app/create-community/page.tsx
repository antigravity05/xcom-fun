import type { Metadata } from "next";
import Link from "next/link";
import { CreateCommunityForm } from "@/components/forms/create-community-form";
import { CenterColumnHeader } from "@/components/layout/center-column-header";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getViewer } from "@/lib/xcom-read-models";
import { createCommunityAction } from "./actions";

export const metadata: Metadata = {
  title: "Create community",
};

export default async function CreateCommunityPage() {
  let viewer;
  try {
    viewer = await getViewer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    return (
      <div style={{ padding: "2rem", color: "white", background: "#0a0a0a", minHeight: "100vh", fontFamily: "monospace" }}>
        <h1 style={{ color: "#ef4444" }}>Create Community Error</h1>
        <p style={{ color: "#fbbf24" }}>{message}</p>
        <pre style={{ fontSize: "12px", color: "#888", whiteSpace: "pre-wrap", marginTop: "1rem" }}>{stack}</pre>
      </div>
    );
  }

  return (
    <XcomChrome
      active="create"
      viewer={
        viewer
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle }
          : null
      }
    >
      <div className="grid w-full max-w-[1012px] xl:grid-cols-[minmax(0,1fr)_348px]">
        <div className="min-w-0 border-x border-white/10">
          <CenterColumnHeader
            title="Create community"
            description="Create a room, become the first admin, and start posting once members join."
          />

          {viewer ? (
            <CreateCommunityForm action={createCommunityAction} />
          ) : (
            <section className="border-b border-white/10 px-4 py-6 sm:px-6">
              <p className="text-sm leading-6 text-copy-muted">
                Connect X before creating a community.
              </p>
              <Link
                href="/connect-x?redirectTo=/create-community"
                className="mt-4 inline-flex rounded-full bg-accent-secondary px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
              >
                Go to Connect X
              </Link>
            </section>
          )}
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
