import type { Metadata } from "next";
import Link from "next/link";
import { CreateCommunityForm } from "@/components/forms/create-community-form";
import { CenterColumnHeader } from "@/components/layout/center-column-header";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getViewer } from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "Create community",
};

export default async function CreateCommunityPage() {
  const viewer = await getViewer();

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
            <CreateCommunityForm />
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
