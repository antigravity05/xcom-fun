import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { MigrateWizard } from "@/components/migrate/migrate-wizard";
import { isXCommunitiesShutdownActive } from "@/lib/x-communities-deadline";
import { getViewer } from "@/lib/xcom-read-models";

export function generateMetadata(): Metadata {
  if (isXCommunitiesShutdownActive()) {
    return {
      title: "Migrate your X community to x-com.fun",
      description:
        "X is deleting Communities on May 6. Move yours to x-com.fun in 3 steps — name it, install the importer, and your tweets follow you.",
    };
  }
  return {
    title: "Migrate your community",
    description: "Move your X community to x-com.fun in 3 steps.",
  };
}

export default async function MigratePage() {
  let viewer;
  try {
    viewer = await getViewer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel-shell max-w-lg rounded-[32px] p-8 text-center sm:p-12">
          <h1 className="text-[20px] font-extrabold text-white">Unable to load page</h1>
          <p className="mt-2 text-[14px] leading-5 text-copy-muted">{message}</p>
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
          <div className="sticky top-[53px] z-20 border-b border-white/[0.08] bg-background/85 backdrop-blur lg:top-0">
            <div className="flex min-h-[53px] items-center px-4 sm:px-6">
              <h1 className="text-[20px] font-extrabold text-white">
                Migrate from X
              </h1>
            </div>
          </div>

          {viewer ? (
            <MigrateWizard
              viewer={{
                displayName: viewer.displayName,
                xHandle: viewer.xHandle,
              }}
            />
          ) : (
            <div className="px-4 py-12 sm:px-6">
              <div className="mx-auto max-w-md text-center">
                <h2 className="text-[24px] font-extrabold text-white sm:text-[28px]">
                  Move your X community here in 3 steps
                </h2>
                <p className="mt-3 text-[15px] leading-6 text-copy-muted">
                  Connect your X account to start. We&apos;ll create the
                  community, you install a small importer, and your existing
                  tweets follow you over.
                </p>
                <Link
                  href="/connect-x?redirectTo=/migrate"
                  className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-accent-secondary px-7 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-accent-secondary/20 transition hover:brightness-110"
                >
                  <span className="text-[20px] font-black">𝕏</span>
                  Connect your X account
                </Link>
                <p className="mt-3 text-[12px] text-copy-soft">
                  One-click login via X. No email, no password.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
