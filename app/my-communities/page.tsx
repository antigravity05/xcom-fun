import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PenSquare, Users } from "lucide-react";
import { CommunityCard } from "@/components/community/community-card";
import { CenterColumnHeader } from "@/components/layout/center-column-header";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { getViewer, listMyCommunities } from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "My Communities — x-com.fun",
  description: "Communities you've joined on x-com.fun.",
};

export default async function MyCommunitiesPage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/connect-x?redirectTo=/my-communities");
  }

  const communities = await listMyCommunities();

  return (
    <XcomChrome
      active="my-communities"
      viewer={{
        displayName: viewer.displayName,
        xHandle: viewer.xHandle,
        avatar: viewer.avatar,
      }}
    >
      <div className="grid w-full max-w-[990px] xl:grid-cols-[600px_350px]">
        <div className="min-w-0 lg:border-x border-white/10">
          <CenterColumnHeader
            title="My Communities"
            description={
              communities.length > 0
                ? `${communities.length} ${communities.length === 1 ? "community" : "communities"} joined`
                : undefined
            }
          />

          {communities.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-16 text-center sm:px-6">
              <div className="flex size-14 items-center justify-center rounded-full bg-white/[0.04]">
                <Users className="size-7 text-copy-soft" />
              </div>
              <div className="mt-4 text-[16px] font-bold text-white">
                No communities yet
              </div>
              <div className="mt-1.5 max-w-[320px] text-[14px] text-copy-muted">
                Join a community from Explore, or create your own.
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/"
                  className="rounded-full border border-white/15 px-4 py-2 text-[14px] font-bold text-white transition hover:bg-white/[0.06]"
                >
                  Explore
                </Link>
                <Link
                  href="/create-community"
                  className="inline-flex items-center gap-2 rounded-full bg-accent-secondary px-4 py-2 text-[14px] font-bold text-white transition hover:brightness-110"
                >
                  <PenSquare className="size-4" />
                  New Community
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {communities.map((community) => (
                <div key={community.slug} className="relative">
                  <CommunityCard community={community} />
                  {community.role !== "member" ? (
                    <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-accent-secondary/30 bg-accent-secondary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-secondary sm:inline-block">
                      {community.role}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="hidden xl:block" />
      </div>
    </XcomChrome>
  );
}
