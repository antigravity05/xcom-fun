import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  MessageSquare,
  Search,
  Share2,
  TrendingUp,
  Users,
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

          {/* ── HOW IT WORKS ── */}
          <section className="border-b border-white/[0.08] px-4 py-12 sm:px-8 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-center text-[13px] font-bold uppercase tracking-[0.16em] text-accent-secondary">
                How it works
              </h2>
              <p className="mt-3 text-center text-[24px] font-extrabold leading-tight text-white sm:text-[28px]">
                Everything you loved about X Communities, rebuilt from scratch.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                <FeatureItem
                  icon={Users}
                  title="Create your community"
                  description="Set up in seconds. Add a banner, description, and invite your holders."
                />
                <FeatureItem
                  icon={MessageSquare}
                  title="Post &amp; discuss"
                  description="Share updates, alpha, and memes. Everything stays organized by project."
                />
                <FeatureItem
                  icon={Share2}
                  title="Syncs to X"
                  description="Posts automatically publish to your X timeline. One post, double the reach."
                />
              </div>
            </div>
          </section>

          {/* ── WHY x-com.fun ── */}
          <section className="border-b border-white/[0.08] px-4 py-12 sm:px-8 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-surface-secondary p-5">
                  <Globe2 className="size-6 text-accent-secondary" />
                  <h3 className="mt-3 text-[16px] font-bold text-white">
                    Open to everyone
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-5 text-copy-muted">
                    Anyone can browse communities without an account. Connect X
                    to join and post.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-surface-secondary p-5">
                  <Zap className="size-6 text-accent-secondary" />
                  <h3 className="mt-3 text-[16px] font-bold text-white">
                    Built for crypto
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-5 text-copy-muted">
                    Contract addresses, token tickers, and community roles —
                    everything a project needs.
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

/* ── Helper components ── */

const FeatureItem = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center text-center">
    <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-secondary/10">
      <Icon className="size-6 text-accent-secondary" />
    </div>
    <h3 className="mt-3 text-[15px] font-bold text-white">{title}</h3>
    <p className="mt-1.5 text-[13px] leading-5 text-copy-muted">
      {description}
    </p>
  </div>
);
