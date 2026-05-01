import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  TrendingUp,
} from "lucide-react";
import { CommunityCard } from "@/components/community/community-card";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { ShutdownCountdown } from "@/components/landing/shutdown-countdown";
import { formatCompactNumber } from "@/lib/xcom-formatters";
import { isXCommunitiesShutdownActive } from "@/lib/x-communities-deadline";
import {
  getViewer,
  listCommunityCards,
  listTrendingCommunityCards,
} from "@/lib/xcom-read-models";

export function generateMetadata(): Metadata {
  if (isXCommunitiesShutdownActive()) {
    return {
      title: "X kills Communities May 6 — move yours to x-com.fun",
      description:
        "X is deleting Communities on May 6. Once gone, your members can't be regrouped. Save your community now on x-com.fun.",
    };
  }
  return {
    title: "x-com.fun — Crypto Communities",
    description:
      "X Communities are back. One place for every crypto project — post here, it syncs to X.",
  };
}

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

  /* ── Logged-out: full landing page ── */
  if (!viewer && !query) {
    return (
      <XcomChrome active="discover" viewer={null}>
        <div className="w-full max-w-[990px]">
          {/* ── HERO ── */}
          <section className="relative overflow-hidden border-b border-white/[0.08]">
            {/* Gradient background */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent-secondary/[0.07] via-transparent to-transparent" />
            <div className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full bg-accent-secondary/[0.04] blur-[120px]" />

            <div className="relative px-4 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-20">
              <div className="mx-auto max-w-xl text-center">
                {isXCommunitiesShutdownActive() ? (
                  <>
                    {/* Urgency badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-red-300">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                      </span>
                      X Communities Shutdown
                    </div>

                    {/* Title */}
                    <h1 className="mt-6 text-[36px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[52px]">
                      X kills Communities
                      <br />
                      <span className="text-red-400">on May 6.</span>
                    </h1>

                    {/* Countdown */}
                    <div className="mt-8">
                      <ShutdownCountdown />
                    </div>

                    {/* Subtitle */}
                    <p className="mx-auto mt-7 max-w-xl text-[18px] font-semibold leading-[1.45] text-white sm:text-[24px]">
                      Once your community is gone, your members{" "}
                      <span className="whitespace-nowrap text-red-400">can&apos;t be regrouped</span>.
                      Move them here while you still can.
                    </p>
                  </>
                ) : (
                  <>
                    {/* Title */}
                    <h1 className="mt-6 text-[36px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[52px]">
                      X communities
                      <br />
                      <span className="text-accent-secondary">are back.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mx-auto mt-5 max-w-md text-[16px] leading-7 text-copy-muted sm:text-[18px]">
                      Twitter killed Communities. We rebuilt them. One place for
                      every crypto project — post here, it syncs to X.
                    </p>
                  </>
                )}

                {/* CTA group */}
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/connect-x"
                    className="inline-flex items-center gap-2.5 rounded-full bg-accent-secondary px-7 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-accent-secondary/20 transition hover:brightness-110"
                  >
                    <span className="text-[20px] font-black">𝕏</span>
                    Connect your X account
                  </Link>
                  <a
                    href="#communities"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-white/[0.04]"
                  >
                    Explore communities
                    <ArrowRight className="size-4" />
                  </a>
                </div>

                {/* Stats */}
                <div className="mt-10 flex items-center justify-center gap-8 text-center sm:gap-12">
                  <div>
                    <div className="text-[24px] font-extrabold tabular-nums text-white sm:text-[28px]">
                      {communities.length}
                    </div>
                    <div className="mt-0.5 text-[13px] text-copy-muted">
                      Communities
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/[0.08]" />
                  <div>
                    <div className="text-[24px] font-extrabold tabular-nums text-white sm:text-[28px]">
                      {formatCompactNumber(
                        communities.reduce((sum, c) => sum + c.memberCount, 0),
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] text-copy-muted">
                      Members
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/[0.08]" />
                  <div>
                    <div className="text-[24px] font-extrabold tabular-nums text-white sm:text-[28px]">
                      Free
                    </div>
                    <div className="mt-0.5 text-[13px] text-copy-muted">
                      Forever
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── VISUAL SCHEMA ── */}
          <section className="border-b border-white/[0.08] px-4 py-14 sm:px-8 sm:py-20 overflow-hidden">
            <div className="mx-auto max-w-2xl">
              <p className="text-center text-[26px] font-extrabold leading-tight text-white sm:text-[34px]">
                Post once here,<br />
                <span className="text-accent-secondary">it tweets for you.</span>
              </p>
              <p className="mx-auto mt-4 max-w-md text-center text-[15px] leading-6 text-copy-muted sm:text-[16px]">
                Every community groups all posts about the same coin.
                When you post, it goes to your X automatically.
              </p>

              {/* ── 3-step horizontal flow on desktop, vertical on mobile ── */}
              <div className="mt-14 flex flex-col items-center gap-0 sm:flex-row sm:items-start sm:gap-0">

                {/* STEP 1 — Write */}
                <div className="flex flex-col items-center sm:flex-1">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-secondary/15 sm:size-14">
                    <svg viewBox="0 0 24 24" className="size-6 text-accent-secondary sm:size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold text-white sm:text-[16px]">Write a post</h3>
                  <p className="mt-1 max-w-[200px] text-center text-[13px] leading-[18px] text-copy-muted">
                    Post in your coin&apos;s community on x-com.fun
                  </p>
                </div>

                {/* Arrow 1 */}
                <div className="flex items-center justify-center py-3 sm:mt-5 sm:py-0 sm:px-0">
                  {/* Mobile: vertical arrow */}
                  <svg className="size-6 text-white/20 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14m0 0l-5-5m5 5l5-5" />
                  </svg>
                  {/* Desktop: horizontal arrow */}
                  <svg className="hidden sm:block h-5 w-10 text-white/20" viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 10h32m0 0l-6-6m6 6l-6 6" />
                  </svg>
                </div>

                {/* STEP 2 — Grouped */}
                <div className="flex flex-col items-center sm:flex-1">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#00ba7c]/15 sm:size-14">
                    <svg viewBox="0 0 24 24" className="size-6 text-[#00ba7c] sm:size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold text-white sm:text-[16px]">Grouped by coin</h3>
                  <p className="mt-1 max-w-[200px] text-center text-[13px] leading-[18px] text-copy-muted">
                    All posts about the same token, in one feed
                  </p>
                </div>

                {/* Arrow 2 */}
                <div className="flex items-center justify-center py-3 sm:mt-5 sm:py-0 sm:px-0">
                  <svg className="size-6 text-white/20 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14m0 0l-5-5m5 5l5-5" />
                  </svg>
                  <svg className="hidden sm:block h-5 w-10 text-white/20" viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 10h32m0 0l-6-6m6 6l-6 6" />
                  </svg>
                </div>

                {/* STEP 3 — Published to X */}
                <div className="flex flex-col items-center sm:flex-1">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.08] sm:size-14">
                    <svg viewBox="0 0 24 24" className="size-6 text-white sm:size-7" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold text-white sm:text-[16px]">Live on X</h3>
                  <p className="mt-1 max-w-[200px] text-center text-[13px] leading-[18px] text-copy-muted">
                    Auto-tweeted from your own account
                  </p>
                </div>
              </div>

              {/* ── Live demo card ── */}
              <div className="mx-auto mt-12 max-w-sm">
                <div className="rounded-2xl border border-white/[0.06] bg-surface-secondary/60 overflow-hidden">
                  {/* Community header */}
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/pepe.png" alt="$PEPE" className="size-8 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold text-white">$PEPE</div>
                    </div>
                    <span className="rounded-full bg-accent-secondary/15 px-2.5 py-0.5 text-[11px] font-bold text-accent-secondary">42 members</span>
                  </div>

                  {/* 3 mini posts */}
                  <div className="divide-y divide-white/[0.04]">
                    {[
                      { handle: "@alice", text: "$PEPE to the moon 🚀", synced: true },
                      { handle: "@bob", text: "Just aped in, chart is clean 📈", synced: true },
                      { handle: "@charlie", text: "Community is growing fast", synced: false },
                    ].map((p) => (
                      <div key={p.handle} className="flex items-start gap-2.5 px-4 py-2.5">
                        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/80">
                          {p.handle[1]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-white">{p.handle}</span>
                            {p.synced ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#00ba7c]">
                                <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                synced
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[10px] text-yellow-500/70">
                                <span className="inline-block size-1 rounded-full bg-yellow-500/70 animate-pulse" />
                                pending
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] leading-4 text-white/60">{p.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── LIVE COMMUNITIES ── */}
          <section id="communities" className="scroll-mt-16">
            {/* Search */}
            <div className="sticky top-[53px] z-20 border-b border-white/[0.08] bg-background/85 px-4 py-2 backdrop-blur lg:top-0">
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

            {/* Trending */}
            {trendingCommunities.length > 0 ? (
              <div className="border-b border-white/[0.08]">
                <div className="flex items-center gap-2 px-4 py-3">
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
              </div>
            ) : null}

            {/* All communities */}
            <div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-copy-muted">
                  All communities
                </span>
                <span className="text-[13px] tabular-nums text-copy-soft">
                  {communities.length}
                </span>
              </div>
              {communities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="border-t border-white/[0.08] px-4 py-12 text-center sm:py-16">
              <h2 className="text-[24px] font-extrabold text-white sm:text-[28px]">
                Ready to join?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[15px] leading-6 text-copy-muted">
                Connect your X account and start posting in communities
                today. No signup needed.
              </p>
              <Link
                href="/connect-x"
                className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-accent-secondary px-7 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-accent-secondary/20 transition hover:brightness-110"
              >
                <span className="text-[20px] font-black">𝕏</span>
                Get started — it&apos;s free
              </Link>
              <p className="mt-3 text-[12px] text-copy-soft">
                One-click login via X. No email, no password.
              </p>
            </div>
          </section>
        </div>
      </XcomChrome>
    );
  }

  /* ── Logged-in or searching: standard feed layout ── */
  return (
    <XcomChrome
      active="discover"
      viewer={
        viewer
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle, avatar: viewer.avatar }
          : null
      }
    >
      <div className="grid w-full max-w-[990px] xl:grid-cols-[600px_350px]">
        <div className="min-w-0 lg:border-x border-white/[0.08]">
          {/* Sticky search bar */}
          <div className="sticky top-[53px] z-20 border-b border-white/[0.08] bg-background/85 px-4 py-2 backdrop-blur lg:top-0">
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

          {/* Trending — only when not searching */}
          {!query && trendingCommunities.length > 0 ? (
            <section className="border-b border-white/[0.08]">
              <div className="flex items-center gap-2 px-4 py-3">
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
            <div className="flex items-center justify-between px-4 py-3">
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
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/[0.04]">
                  <Search className="size-6 text-copy-soft" />
                </div>
                <p className="mt-4 text-[16px] font-bold text-white">
                  {query
                    ? "No results"
                    : "No communities yet"}
                </p>
                <p className="mt-1.5 text-[14px] text-copy-muted">
                  {query
                    ? `Nothing matches "${query}". Try a different search.`
                    : "Be the first to create a community for your project."}
                </p>
                {viewer && !query ? (
                  <Link
                    href="/create-community"
                    className="mt-5 inline-flex rounded-full bg-accent-secondary px-5 py-2.5 text-[14px] font-bold text-white transition hover:brightness-110"
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
            <section className="rounded-2xl border border-white/10 bg-background py-3">
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
                      className="size-9 shrink-0 overflow-hidden rounded-lg"
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
              <span className="font-medium text-copy-muted">x-com.fun</span> — The
              home for crypto communities.
            </div>
          </div>
        </aside>
      </div>
    </XcomChrome>
  );
}

