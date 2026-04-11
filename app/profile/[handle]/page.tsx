import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Calendar, MessageCircle, Heart, Users } from "lucide-react";
import { PostFeed } from "@/components/community/post-feed";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import { formatCompactNumber } from "@/lib/xcom-formatters";
import { getUserProfileView } from "@/lib/xcom-read-models";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const view = await getUserProfileView(decodeURIComponent(handle));

  if (!view) {
    return { title: "User not found" };
  }

  return {
    title: `${view.user.displayName} (${view.user.xHandle})`,
    description: `${view.user.displayName} on x-com.fun — ${view.stats.posts} posts across ${view.stats.communities} communities`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const view = await getUserProfileView(decodeURIComponent(handle));

  if (!view) {
    notFound();
  }

  const { user, viewer, memberships, posts, stats } = view;

  return (
    <XcomChrome
      active="profile"
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
            <div className="flex min-h-[53px] items-center gap-3 px-4 sm:px-6">
              <h1 className="text-[20px] font-extrabold text-white">
                {user.displayName}
              </h1>
              {user.verified ? (
                <BadgeCheck className="size-5 fill-accent-secondary text-background" />
              ) : null}
            </div>
          </div>

          {/* Profile banner area */}
          <div className="relative">
            <div className="h-32 bg-gradient-to-r from-[#14233c] to-[#21406b]" />
            <div className="absolute -bottom-10 left-4 sm:left-6">
              <div className="flex size-20 items-center justify-center rounded-full border-4 border-background bg-surface-secondary text-2xl font-bold text-white overflow-hidden">
                {user.avatar?.startsWith("http") ? (
                  <img src={user.avatar} alt={user.displayName} className="size-full object-cover" />
                ) : (
                  user.avatar
                )}
              </div>
            </div>
          </div>

          {/* Profile info */}
          <div className="mt-14 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-extrabold text-white">
                {user.displayName}
              </span>
              {user.verified ? (
                <BadgeCheck className="size-5 fill-accent-secondary text-background" />
              ) : null}
            </div>
            <div className="mt-0.5 text-[15px] text-copy-muted">
              {user.xHandle}
            </div>

            {/* Stats */}
            <div className="mt-4 flex flex-wrap gap-5 text-[14px]">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="size-4 text-copy-soft" />
                <span className="font-bold text-white">{formatCompactNumber(stats.posts)}</span>
                <span className="text-copy-muted">posts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="size-4 text-copy-soft" />
                <span className="font-bold text-white">{formatCompactNumber(stats.communities)}</span>
                <span className="text-copy-muted">communities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="size-4 text-copy-soft" />
                <span className="font-bold text-white">{formatCompactNumber(stats.totalLikes)}</span>
                <span className="text-copy-muted">likes received</span>
              </div>
            </div>

            {/* Communities badges */}
            {memberships.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {memberships.map((m) => (
                  <Link
                    key={m.communitySlug}
                    href={`/communities/${m.communitySlug}`}
                    className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface-secondary/50 px-3 py-1.5 text-[13px] text-white transition hover:bg-white/[0.06]"
                  >
                    <div
                      className="size-5 shrink-0 rounded overflow-hidden"
                      style={
                        m.communityBannerUrl
                          ? {
                              backgroundImage: `url(${m.communityBannerUrl})`,
                              backgroundPosition: "center",
                              backgroundSize: "cover",
                            }
                          : {
                              background: `linear-gradient(135deg, ${m.coverFrom}, ${m.accentColor})`,
                            }
                      }
                    />
                    <span className="font-medium">{m.communityName}</span>
                    {m.role !== "member" ? (
                      <span className="rounded bg-accent-secondary/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-accent-secondary">
                        {m.role}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* Posts section */}
          <div className="mt-5 border-t border-white/[0.08]">
            <div className="border-b border-white/[0.08] px-4 py-3 sm:px-6">
              <span className="text-[15px] font-bold text-white">Posts</span>
            </div>

            {posts.length > 0 ? (
              <PostFeed
                posts={posts}
                communitySlug=""
                activeTab="latest"
                canInteract={false}
                viewerHandle={viewer?.xHandle ?? null}
                viewerRole={null}
                editingPostId={null}
              />
            ) : (
              <div className="px-4 py-12 text-center sm:px-6">
                <p className="text-[15px] text-copy-muted">
                  No posts yet.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-0 space-y-3 px-5 pt-3">
            <section className="rounded-2xl border border-white/[0.04] bg-surface-secondary py-3">
              <h2 className="px-4 text-[20px] font-extrabold text-white">
                Communities
              </h2>
              {memberships.length > 0 ? (
                <div className="mt-1">
                  {memberships.map((m) => (
                    <Link
                      key={m.communitySlug}
                      href={`/communities/${m.communitySlug}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.04]"
                    >
                      <div
                        className="size-9 shrink-0 rounded-lg overflow-hidden"
                        style={
                          m.communityBannerUrl
                            ? {
                                backgroundImage: `url(${m.communityBannerUrl})`,
                                backgroundPosition: "center",
                                backgroundSize: "cover",
                              }
                            : {
                                background: `linear-gradient(135deg, ${m.coverFrom}, ${m.accentColor})`,
                              }
                        }
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-bold text-white">
                          {m.communityName}
                        </div>
                        <div className="text-[12px] text-copy-muted capitalize">
                          {m.role}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 px-4 text-[13px] text-copy-muted">
                  Not a member of any community yet.
                </p>
              )}
            </section>
          </div>
        </aside>
      </div>
    </XcomChrome>
  );
}
