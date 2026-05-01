import type { Metadata } from "next";
import Link from "next/link";
import { CreateCommunityForm } from "@/components/forms/create-community-form";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { isXCommunitiesShutdownActive } from "@/lib/x-communities-deadline";
import { getViewer } from "@/lib/xcom-read-models";

export function generateMetadata(): Metadata {
  if (isXCommunitiesShutdownActive()) {
    return {
      title: "Migrate your community to x-com.fun",
      description:
        "X kills Communities on May 6. Move yours to x-com.fun before your members can't be regrouped.",
    };
  }
  return {
    title: "Create community",
    description:
      "Create a community for your crypto project. Group all posts about your coin in one place.",
  };
}

export default async function CreateCommunityPage() {
  const isMigrating = isXCommunitiesShutdownActive();
  let viewer;
  try {
    viewer = await getViewer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel-shell max-w-lg rounded-[32px] p-8 text-center sm:p-12">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft/10">
            <span className="text-[24px] text-danger-soft">!</span>
          </div>
          <h1 className="mt-5 text-[20px] font-extrabold text-white">
            Unable to load page
          </h1>
          <p className="mt-2 text-[14px] leading-5 text-copy-muted">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <XcomChrome
      active="create"
      viewer={
        viewer
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle, avatar: viewer.avatar }
          : null
      }
    >
      <div className="grid w-full max-w-[990px] xl:grid-cols-[600px_350px]">
        <div className="min-w-0 lg:border-x border-white/[0.08]">
          {/* Header */}
          <div className="sticky top-[53px] z-20 border-b border-white/[0.08] bg-background/85 backdrop-blur lg:top-0">
            <div className="flex min-h-[53px] items-center px-4 sm:px-6">
              <h1 className="text-[20px] font-extrabold text-white">
                {isMigrating ? "Migrate your community" : "New community"}
              </h1>
            </div>
          </div>

          {viewer ? (
            <CreateCommunityForm />
          ) : (
            <div className="px-4 py-12 text-center sm:px-6">
              <p className="text-[15px] text-copy-muted">
                {isMigrating
                  ? "Connect X to migrate your community."
                  : "Connect X to create a community."}
              </p>
              <Link
                href="/connect-x?redirectTo=/create-community"
                className="mt-4 inline-flex rounded-full bg-accent-secondary px-5 py-2.5 text-[14px] font-bold text-white transition hover:brightness-110"
              >
                Connect X
              </Link>
            </div>
          )}
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
