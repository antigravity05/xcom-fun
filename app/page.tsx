import type { Metadata } from "next";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { CommunityCard } from "@/components/community/community-card";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { formatCompactNumber } from "@/lib/xcom-formatters";
import {
  getViewer,
  listCommunityCards,
  listTrendingCommunityCards,
} from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "X-COM — Crypto Communities",
};

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

const matchesCommunity = (query: string, candidate: string) => {
  return candidate.toLowerCase().includes(query);
};

export default async function Home({ searchParams }: HomePageProps) {
  const { q = "" } = await searchParams;

  let viewer;
  let communities;
  try {
    viewer = await getViewer();
    communities = await listCommunityCards();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel-shell max-w-lg rounded-[32px] p-8 text-center sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-soft/10">
            <span className="text-[28px] text-danger-soft">!</span>
          </div>
          <h1 className="mt-6 text-[24px] font-extrabold text-white">
            Unable to load communities
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-copy-muted">
            {message}
          </p>
        </div>
      </div>
    );
  }

  const query = q.trim().toLowerCase();

  const filteredCommunities = query
    ? communities.filter((community) => {
        return (
          matchesCommunity(query, community.name) ||
          matchesCommunity(query, community.tagline) ||
          matchesCommunity(query, community.ticker)
        );
      })
    : communities;

  const trendingCommunities = query
    ? filteredCommunities.slice(0, 4)
    : await listTrendingCommunityCards();

  return (
    <XcomChrome
      active="discover"
      viewer={
        viewer
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle }
          : null
      }
    >
      <div className="grid w-full max-w-[990px] xl:grid-cols-[600px_350px]">
        <div className="min-w-0 border-x border-white/[0.08]">
          {/* Sticky search bar */}
          <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-background/85 px-4 py-2 backdrop-blur sm:px-4">
            <form>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[16px] -translate-y-1/2 text-copy-soft" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search communities"
                  className="signal-focus w-full rounded-full border border-white/[0.08] bg-surface-secondary/80 py-2.5 pl-10 pr-4 text-[15px] text-white placeholder:text-copy-soft"
                />
              </div>
            </form>
          </div>

          {/* Hero — logged-out only, no search */}
          {!viewer && !query ? (
            <section className="border-b border-white/[0.08] px-4 py-10 sm:px-6 sm:py-12">
              <div className="mx-auto max-w-md text-center">
                <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[40px]">
                  X communities{" "}
                  <span className="text-accent-secondary">are back.</span>
                </h1>
                <p className="mt-3 text-[15px] leading-6 text-copy-muted">
                  One place for every project. Post here, it syncs to X.
                </p>
                <a
                  href="/connect-x"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-secondary px-6 py-3 text-[15px] font-bold text-white transition hover:brightness-110"
                >
                  Get started
                </a>
              </div>
            </section>
          ) : null}

          {/* Trending — only when not searching */}
          {!query && trendingCommunities.length > 0 ? (
            <section className="border-b border-white/[0.08]">
              <div className="flex items-center gap-2 px-4 py-3 sm:px-4">
                <TrendingUp className="size-4 text-accent-secondary" />
                <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-copy-muted">
                  Trending
                </span>
              </div>
              {trendingCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  showRank
                />
              ))}
            </section>
          ) : null}

          {/* All / Search results */}
          <section>
            <div className="flex items-center justify-between px-4 py-3 sm:px-4">
              <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-copy-muted">
                {query ? "Results" : "All communities"}
              </span>
              <span className="text-[13px] tabular-nums text-copy-soft">
                {filteredCommunities.length}
              </span>
            </div>
            {filteredCommunities.length ? (
              filteredCommunities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))
            ) : (
              <div className="px-4 py-16 text-center">
                <p className="text-[15px] text-copy-muted">
                  {query
                    ? "No communities match your search."
                    : "No communities yet."}
                </p>
                {viewer && !query ? (
                  <Link
                    href="/create-community"
                    className="mt-4 inline-flex rounded-full bg-accent-secondary px-5 py-2.5 text-[14px] font-bold text-white transition hover:brightness-110"
                  >
                    Create the first one
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar — desktop only */}
        <aside className="hidden xl:block">
          <div className="sticky top-0 space-y-3 px-5 pt-3">
            {/* Trending widget */}
            <section className="rounded-2xl bg-surface-secondary border border-white/[0.04] py-3">
              <h2 className="px-4 text-[20px] font-extrabold text-white">
                Trending
              </h2>
              <div className="mt-2">
                {trendingCommunities.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/communities/${entry.slug}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.04]"
                  >
                    <div
                      className="size-9 shrink-0 rounded-lg overflow-hidden"
                      style={
                        entry.bannerUrl
                          ? {
                              backgroundImage: `url(${entry.bannerUrl})`,
                              backgroundPosition: "center",
                              backgroundSize: "cover",
                            }
                          : {
                              background: `linear-gradient(135deg, ${entry.coverFrom}, ${entry.accentColor})`,
                            }
                      }
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-bold text-white">
                        {entry.name}
                      </div>
                      <div className="text-[12px] text-copy-muted">
                        {formatCompactNumber(entry.memberCount)}{" "}
                        {entry.memberCount === 1 ? "member" : "members"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* About — minimal footer */}
            <div className="px-4 py-3 text-[12px] leading-4 text-copy-soft">
              <span className="font-medium text-copy-muted">X-COM</span> — The
              home for crypto communities.{" "}
              <a
                href="https://x-com.fun"
                className="text-accent-secondary hover:underline"
              >
                x-com.fun
              </a>
            </div>
          </div>
        </aside>
      </div>
    </XcomChrome>
  );
}
