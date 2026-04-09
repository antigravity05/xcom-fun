import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, BadgeCheck, Globe2, Hash, Users } from "lucide-react";
import {
  createPostAction,
  deleteCommunityAction,
  setMemberRoleAction,
} from "@/app/xcom-actions";
import { CommunityHeader } from "@/components/community/community-header";
import { PostCard } from "@/components/community/post-card";
import { XcomChrome } from "@/components/layout/xcom-chrome";
import type { CommunityMemberRecord, CommunityTab } from "@/lib/xcom-domain";
import {
  formatCompactNumber,
  formatRelativeTime,
  shortenContractAddress,
} from "@/lib/xcom-formatters";
import {
  getCommunityTimelineView,
  listCommunityCards,
} from "@/lib/xcom-read-models";

type CommunityPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; editing?: string }>;
};

const resolveTab = (value?: string): CommunityTab => {
  if (
    value === "latest" ||
    value === "media" ||
    value === "members" ||
    value === "about"
  ) {
    return value;
  }

  return "top";
};

export async function generateMetadata({
  params,
}: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const community = (await listCommunityCards()).find((entry) => entry.slug === slug);

  if (!community) {
    return {
      title: "Community not found",
    };
  }

  return {
    title: community.name,
    description: community.description,
  };
}

export default async function CommunityPage({
  params,
  searchParams,
}: CommunityPageProps) {
  const { slug } = await params;
  const { tab, editing } = await searchParams;
  const view = await getCommunityTimelineView(slug);

  if (!view) {
    notFound();
  }

  const activeTab = resolveTab(tab);
  const {
    community,
    members,
    posts,
    relatedCommunities,
    viewer,
    viewerMembershipStatus,
    viewerRole,
  } = view;
  const activeAdminCount = members.filter((member) => member.role === "admin").length;
  const canLeaveCommunity =
    viewerMembershipStatus === "active" &&
    !(viewerRole === "admin" && activeAdminCount <= 1);

  return (
    <XcomChrome
      active="community"
      viewer={
        viewer
          ? { displayName: viewer.displayName, xHandle: viewer.xHandle }
          : null
      }
    >
      <div className="grid w-full max-w-[1012px] xl:grid-cols-[minmax(0,1fr)_348px]">
        <div className="min-w-0 border-x border-white/10">
          <CommunityHeader
            community={community}
            activeTab={activeTab}
            hasViewer={Boolean(viewer)}
            viewerMembershipStatus={viewerMembershipStatus}
            canLeaveCommunity={canLeaveCommunity}
          />

          {activeTab === "about" ? (
            <section className="border-b border-white/10">
              <div className="px-4 py-5 sm:px-6">
                <div className="text-[20px] font-extrabold text-white">
                  Community info
                </div>
                <p className="mt-4 text-[15px] leading-6 text-white">
                  {community.description}
                </p>
                <div className="mt-5 space-y-1 text-[15px] text-copy-muted">
                  <div className="flex items-start gap-3 rounded-2xl px-1 py-2">
                    <Users className="mt-0.5 size-5 shrink-0 text-copy-muted" />
                    <div>
                      <div className="font-bold text-white">
                        {formatCompactNumber(community.memberCount)} members
                      </div>
                      <div className="mt-1 text-copy-muted">
                        Members can join and participate in the community.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl px-1 py-2">
                    <Globe2 className="mt-0.5 size-5 shrink-0 text-copy-muted" />
                    <div>
                      <div className="font-bold text-white">Public visibility</div>
                      <div className="mt-1 text-copy-muted">
                        Anyone can discover and join this community.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl px-1 py-2">
                    <AtSign className="mt-0.5 size-5 shrink-0 text-copy-muted" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Created by</span>
                        <span className="truncate text-white">
                          {community.createdBy.handle}
                        </span>
                        {community.createdBy.verified ? (
                          <BadgeCheck className="size-4 shrink-0 fill-accent-secondary text-accent-secondary" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {community.contractAddress ? (
                    <div className="flex items-start gap-3 rounded-2xl px-1 py-2">
                      <Hash className="mt-0.5 size-5 shrink-0 text-copy-muted" />
                      <div>
                        <div className="font-bold text-white">Contract address</div>
                        <div className="mt-1 text-copy-muted">
                          {shortenContractAddress(community.contractAddress)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-white/10 px-4 py-5 sm:px-6">
                <div className="text-[20px] font-extrabold text-white">Rules</div>
                <div className="mt-4">
                  {community.rules.map((rule, index) => (
                    <div
                      key={rule}
                      className={`py-4 ${index > 0 ? "border-t border-white/10" : ""}`}
                    >
                      <div className="text-[15px] leading-6 text-white">{rule}</div>
                    </div>
                  ))}
                </div>
              </div>

              {viewerRole === "admin" ? (
                <div className="border-t border-white/10 px-4 py-5 sm:px-6">
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-copy-muted">
                    Admin controls
                  </div>
                  <p className="mt-3 text-[15px] leading-6 text-copy-muted">
                    Deleting this community removes its members, posts, replies
                    and likes from the app.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/communities/${community.slug}/edit`}
                      className="rounded-full border border-white/15 bg-background px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.06]"
                    >
                      Edit community
                    </Link>
                    <form action={deleteCommunityAction}>
                      <input
                        type="hidden"
                        name="communitySlug"
                        value={community.slug}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/15"
                      >
                        Delete community
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </section>
          ) : activeTab === "members" ? (
            <section className="border-b border-white/10">
              <div className="signal-divider px-4 py-4 sm:px-6">
                <div>
                  <div className="text-[20px] font-extrabold text-white">Members</div>
                  <div className="mt-1 text-[15px] text-copy-muted">
                    {formatCompactNumber(members.length)} members
                    <span className="mx-1.5 text-copy-soft">·</span>
                    Active members in this community
                  </div>
                </div>
              </div>
              <div>
                {members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    communitySlug={community.slug}
                    canManageRoles={viewerRole === "admin"}
                  />
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="border-b border-white/10 bg-background/60 px-4 py-2.5 text-[13px] leading-4 text-copy-muted backdrop-blur sm:px-6">
                {viewerMembershipStatus === "active"
                  ? "You're in this community. Posts appear here first, then sync to X."
                  : viewer
                    ? "Join this community to post."
                    : "Connect X to join and post."}
              </section>

              {viewerMembershipStatus === "active" ? (
                <form
                  action={createPostAction}
                  className="border-b border-white/10 px-4 py-4 sm:px-6"
                >
                  <input type="hidden" name="communitySlug" value={community.slug} />
                  <input
                    type="hidden"
                    name="redirectTo"
                    value={`/communities/${community.slug}?tab=${activeTab}`}
                  />
                  <div className="flex gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${community.coverTo}, ${community.accentColor})`,
                      }}
                    >
                      {viewer?.avatar ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <textarea
                        name="body"
                        rows={2}
                        className="signal-focus min-h-[56px] w-full resize-none border-0 bg-transparent px-0 py-2 text-[17px] leading-6 text-white placeholder:text-copy-soft focus:outline-none"
                        placeholder="What's happening?"
                      />
                      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                        <span className="text-[12px] text-copy-soft">
                          Posts sync to your X profile
                        </span>
                        <button
                          type="submit"
                          className="rounded-full bg-accent-secondary px-5 py-2 text-[15px] font-bold text-white transition hover:brightness-110"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : null}

              <section>
                {posts.length ? (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      interaction={{
                        communitySlug: community.slug,
                        redirectTo: `/communities/${community.slug}?tab=${activeTab}`,
                        canInteract: viewerMembershipStatus === "active",
                        canEdit: viewer?.xHandle === post.author.handle,
                        canDelete:
                          viewer?.xHandle === post.author.handle ||
                          viewerRole === "admin" ||
                          viewerRole === "moderator",
                        canPin:
                          viewerRole === "admin" || viewerRole === "moderator",
                        isEditing: editing === post.id,
                        editHref: `/communities/${community.slug}?tab=${activeTab}&editing=${post.id}`,
                      }}
                    />
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-copy-muted sm:px-6">
                    No posts yet.
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="hidden xl:block px-8 py-2">
          <div className="sticky top-0 space-y-4">
            <section className="panel-shell rounded-2xl p-5">
              <div className="text-xl font-extrabold text-white">About</div>
              <p className="mt-4 text-[15px] leading-6 text-copy-muted">
                {community.description}
              </p>

              <div className="mt-5 space-y-3 text-[15px] text-copy-muted">
                <div className="flex items-center justify-between gap-4">
                  <span>Members</span>
                  <span className="font-bold text-white">
                    {formatCompactNumber(community.memberCount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Created by</span>
                  <span className="font-bold text-white">
                    {community.createdBy.handle}
                  </span>
                </div>
                {community.contractAddress ? (
                  <div className="flex items-center justify-between gap-4">
                    <span>CA</span>
                    <span className="font-bold text-white">
                      {shortenContractAddress(community.contractAddress)}
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="panel-shell rounded-2xl p-5">
              <div className="text-xl font-extrabold text-white">
                Trending communities
              </div>
              <div className="mt-4 space-y-1">
                {relatedCommunities.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/communities/${entry.slug}`}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/[0.04]"
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
          </div>
        </aside>
      </div>
    </XcomChrome>
  );
}

const MemberRow = ({
  member,
  communitySlug,
  canManageRoles,
}: {
  member: CommunityMemberRecord;
  communitySlug: string;
  canManageRoles: boolean;
}) => {
  const nextRole = member.role === "moderator" ? "member" : "moderator";
  const roleActionLabel =
    member.role === "moderator" ? "Remove mod" : "Make mod";
  const roleLabel =
    member.role === "admin"
      ? "Admin"
      : member.role === "moderator"
        ? "Moderator"
        : "Member";

  return (
    <div className="group signal-divider flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] last:border-b-0 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white">
          {member.avatar}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-bold text-white">
              {member.displayName}
            </span>
            {member.verified ? (
              <BadgeCheck className="size-4 fill-accent-secondary text-accent-secondary" />
            ) : null}
            {member.isViewer ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-copy-muted">
                You
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-copy-muted">
            <span>{member.handle}</span>
            <span className="text-copy-soft">·</span>
            <span>{roleLabel}</span>
          </div>
          <div className="mt-1 text-[13px] text-copy-soft">
            Joined {formatRelativeTime(member.joinedAt)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canManageRoles && !member.isViewer && member.role !== "admin" ? (
          <form action={setMemberRoleAction}>
            <input type="hidden" name="communitySlug" value={communitySlug} />
            <input type="hidden" name="targetUserId" value={member.userId} />
            <input type="hidden" name="role" value={nextRole} />
            <input
              type="hidden"
              name="redirectTo"
              value={`/communities/${communitySlug}?tab=members`}
            />
            <button
              type="submit"
              className="rounded-full border border-white/10 bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-copy-muted transition hover:bg-white/[0.06] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            >
              {roleActionLabel}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
};
