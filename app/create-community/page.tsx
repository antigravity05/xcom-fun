import type { Metadata } from "next";
import Link from "next/link";
import { CreateCommunityForm } from "@/components/forms/create-community-form";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getViewer } from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "Create community",
};

export default async function CreateCommunityPage() {
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
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle }
          : null
      }
    >
      <div className="grid w-full max-w-[1012px] xl:grid-cols-[minmax(0,1fr)_348px]">
        <div className="min-w-0 border-x border-white/[0.08]">
          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-background/85 backdrop-blur">
            <div className="flex min-h-[53px] items-center px-4 sm:px-6">
              <h1 className="text-[20px] font-extrabold text-white">
                New community
              </h1>
            </div>
          </div>

          {viewer ? (
            <CreateCommunityForm />
          ) : (
            <div className="px-4 py-12 text-center sm:px-6">
              <p className="text-[15px] text-copy-muted">
                Connect X to create a community.
              </p>
              <Link
                href="/connect-x?redirectTo=/create-community"
                className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-black transition hover:bg-white/90"
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
