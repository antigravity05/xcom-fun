import type { Metadata } from "next";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { CommunityCard } from "@/components/community/community-card";
import { CenterColumnHeader } from "@/components/layout/center-column-header";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { formatCompactNumber } from "@/lib/xcom-formatters";
import {
  getViewer,
  listCommunityCards,
  listTrendingCommunityCards,
} from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "xcom.fun — Crypto Communities",
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
    const stack = err instanceof Error ? err.stack : "";
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
      <div className="grid w-full max-w-[1012px] xl:grid-cols-[minmax(0,1fr)_348px]">
        <div className="min-w-0 border-x border-white/10">
          <CenterColumnHeader
            title="Communities"
            action={
              viewer ? (
                <Link
                  href="/create-community"
                  className="rounded-full bg-white px-4 py-2 text-[14px] font-bold text-black transition hover:bg-white/90"
                >
                  + Create
                </Link>
              ) : null
            }
          >
            <form>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-copy-soft" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search communities..."
                  className="signal-focus w-full rounded-full border border-white/10 bg-surface-secondary py-3 pl-11 pr-4 text-[15px] text-white placeholder:text-copy-soft"
                />
              </div>
            </form>
          </CenterColumnHeader>

          {/* Hero section for logged-out users */}
          {!viewer && !query ? (
            <section className="relative overflow-hidden border-b border-white/10">
              <div className="absolute inset-0 signal-grid opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-b from-accent-secondary/[0.06] via-transparent to-transparent" />
              <div className="relative px-4 py-10 sm:px-6 sm:py-14">
                <div className="mx-auto max-w-lg text-center">
                  <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-white sm:text-[36px]">
                    Crypto communities,<br />
                    <span className="text-accent-secondary">powered by X</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-[15px] leading-6 text-copy-muted">
                    Join communities for your favorite projects. Post here, it goes straight to your X profile. All the signal, none of the noise.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <a
                      href="/connect-x"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-bold text-black transition hover:bg-white/90"
                    >
                      Connect X to start
                    </a>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4 text-[13px] text-copy-soft">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-1.5 rounded-full bg-accent-tertiary animate-pulse-glow" />
                      {formatCompactNumber(communities.length)} communities
                    </span>
                    <span>·</span>
                    <span>Free to join</span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Trending section — only when not searching */}
          {!query && trendingCommunities.length > 0 ? (
            <section className="border-b border-white/10">
              <div className="flex items-center gap-2 px-4 py-3">
                <TrendingUp className="size-4 text-accent-secondary" />
                <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-copy-muted">
                  Trending
                </div>
              </div>
              <div>
                {trendingCommunities.map((community) => (
                  <div key={community.id} className="signal-divider last:border-b-0">
                    <CommunityCard community={community} showRank />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* All / search results */}
          <section>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-[13px] font-bold uppercase tracking-[0.16em] text-copy-muted">
                {query ? "Search results" : "All communities"}
              </div>
              <div className="text-[13px] text-copy-muted">
                {formatCompactNumber(filteredCommunities.length)}
              </div>
            </div>
            <div>
              {filteredCommunities.length ? (
                filteredCommunities.map((community) => (
                  <div key={community.id} className="signal-divider last:border-b-0">
                    <CommunityCard community={community} />
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center">
                  <div className="text-[15px] text-copy-muted">
                    {query
                      ? "No communities match your search."
                      : "No communities yet. Be the first to create one!"}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="hidden xl:block px-6 py-2">
          <div className="sticky top-0 space-y-4 pt-2">
            <section className="panel-shell rounded-2xl p-5">
              <div className="text-[20px] font-extrabold text-white">
                Trending
              </div>
              <div className="mt-4 space-y-0.5">
                {trendingCommunities.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/communities/${entry.slug}`}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/[0.04]"
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${entry.coverFrom}, ${entry.accentColor})`,
                      }}
                    >
                      {entry.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-white">
                        {entry.name}
                      </div>
                      <div className="text-[13px] text-copy-muted">
                        {formatCompactNumber(entry.memberCount)} members
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="panel-shell rounded-2xl p-5">
              <div className="text-[15px] font-bold text-white">
                About XCOM
              </div>
              <div className="mt-2 text-[13px] leading-5 text-copy-muted">
                The home for crypto communities. Create a space for your project, share updates, and keep your community in the loop — all in one place.
              </div>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-copy-soft">
                <span className="inline-block size-1.5 rounded-full bg-accent-tertiary animate-pulse-glow" />
                <span>xcom.fun</span>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </XcomChrome>
  );
}
