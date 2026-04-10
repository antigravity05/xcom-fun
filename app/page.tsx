import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  TrendingUp,
  Zap,
} from "lucide-react";
import { CommunityCard } from "@/components/community/community-card";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { formatCompactNumber } from "@/lib/xcom-formatters";
import {
  getViewer,
  listCommunityCards,
  listTrendingCommunityCards,
} from "@/lib/xcom-read-models";

export const metadata: Metadata = {
  title: "x-com.fun — Crypto Communities",
  description:
    "X Communities are back. One place for every crypto project — post here, it syncs to X.",
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
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-secondary/20 bg-accent-secondary/[0.08] px-4 py-1.5 text-[13px] font-medium text-accent-secondary">
                  <Zap className="size-3.5" />
                  Replacing X Communities
                </div>

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
          <section className="border-b border-white/[0.08] px-4 py-12 sm:px-8 sm:py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-[13px] font-bold uppercase tracking-[0.16em] text-accent-secondary">
                How it works
              </h2>
              <p className="mt-3 text-center text-[24px] font-extrabold leading-tight text-white sm:text-[28px]">
                All tweets about the same coin,<br />
                <span className="text-accent-secondary">in one place.</span>
              </p>

              {/* ── Schema diagram ── */}
              <div className="mt-12">
                {/* Row 1 — Scattered tweets from different users */}
                <div className="flex flex-col items-center">
                  <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.12em] text-copy-soft">
                    Scattered across X
                  </p>
                  <div className="grid w-full max-w-xl grid-cols-3 gap-3">
                    {/* Fake tweet bubbles */}
                    {[
                      { user: "@alice", text: "$PEPE to the moon 🚀", color: "from-[#4FC3F7]/10 to-[#4FC3F7]/5" },
                      { user: "@bob", text: "Just aped into $PEPE", color: "from-[#f91880]/10 to-[#f91880]/5" },
                      { user: "@charlie", text: "$PEPE chart looking clean", color: "from-[#00ba7c]/10 to-[#00ba7c]/5" },
                    ].map((tweet) => (
                      <div
                        key={tweet.user}
                        className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${tweet.color} p-3`}
                      >
                        <div className="text-[11px] font-bold text-copy-muted">{tweet.user}</div>
                        <div className="mt-1 text-[12px] leading-4 text-white/80">{tweet.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Animated arrows down → x-com.fun */}
                <div className="flex flex-col items-center py-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent-secondary/40" />
                    <div className="flex flex-col items-center gap-1">
                      <svg width="24" height="32" viewBox="0 0 24 32" fill="none" className="text-accent-secondary animate-bounce">
                        <path d="M12 0v24m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent-secondary/40" />
                  </div>
                  <div className="mt-2 rounded-full border border-accent-secondary/30 bg-accent-secondary/[0.08] px-4 py-1 text-[12px] font-bold text-accent-secondary">
                    Grouped on x-com.fun
                  </div>
                </div>

                {/* Row 2 — The x-com.fun community (grouped) */}
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-md rounded-2xl border border-accent-secondary/20 bg-surface-secondary/80 shadow-lg shadow-accent-secondary/[0.06]">
                    {/* Community header */}
                    <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00ba7c] to-[#4FC3F7] text-[14px] font-black text-white">
                        P
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-white">$PEPE Community</div>
                        <div className="text-[11px] text-copy-muted">3 members posting together</div>
                      </div>
                    </div>
                    {/* Mini feed */}
                    <div className="divide-y divide-white/[0.04] px-4">
                      {[
                        { user: "@alice", text: "$PEPE to the moon 🚀" },
                        { user: "@bob", text: "Just aped into $PEPE" },
                        { user: "@charlie", text: "$PEPE chart looking clean" },
                      ].map((post) => (
                        <div key={post.user} className="flex items-start gap-2.5 py-2.5">
                          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold text-white">
                            {post.user[1]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[12px] font-bold text-white">{post.user}</span>
                            <p className="text-[12px] leading-4 text-white/70">{post.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Animated arrows down → X (Twitter) */}
                <div className="flex flex-col items-center py-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#f91880]/40" />
                    <div className="flex flex-col items-center gap-1">
                      <svg width="24" height="32" viewBox="0 0 24 32" fill="none" className="text-[#f91880] animate-bounce" style={{ animationDelay: "0.3s" }}>
                        <path d="M12 0v24m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#f91880]/40" />
                  </div>
                  <div className="mt-2 rounded-full border border-[#f91880]/30 bg-[#f91880]/[0.08] px-4 py-1 text-[12px] font-bold text-[#f91880]">
                    Auto-posted to each user&apos;s 𝕏
                  </div>
                </div>

                {/* Row 3 — Published on X simultaneously */}
                <div className="flex flex-col items-center">
                  <div className="grid w-full max-w-xl grid-cols-3 gap-3">
                    {[
                      { user: "@alice", text: "$PEPE to the moon 🚀" },
                      { user: "@bob", text: "Just aped into $PEPE" },
                      { user: "@charlie", text: "$PEPE chart looking clean" },
                    ].map((tweet) => (
                      <div
                        key={tweet.user}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                      >
                        <div className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="size-3 text-white/40" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span className="text-[11px] font-bold text-copy-muted">{tweet.user}</span>
                        </div>
                        <div className="mt-1 text-[12px] leading-4 text-white/60">{tweet.text}</div>
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-copy-soft">
                          <span className="inline-block size-1.5 rounded-full bg-[#00ba7c]" />
                          Published
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[13px] text-copy-muted">
                    Each member&apos;s post goes to <span className="font-bold text-white">their own X profile</span> automatically.
                  </p>
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
                today.
              </p>
              <Link
                href="/connect-x"
                className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-accent-secondary px-7 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-accent-secondary/20 transition hover:brightness-110"
              >
                <span className="text-[20px] font-black">𝕏</span>
                Get started — it&apos;s free
              </Link>
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
        <div className="min-w-0 border-x border-white/[0.08]">
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
            <section className="rounded-2xl border border-white/[0.04] bg-surface-secondary py-3">
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

