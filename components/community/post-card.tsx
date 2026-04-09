import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Repeat2,
  Share,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createReplyAction,
  deletePostAction,
  togglePinnedPostAction,
  toggleRepostAction,
  toggleLikeAction,
  updatePostAction,
} from "@/app/xcom-actions";
import type { CommunityPostRecord } from "@/lib/xcom-domain";
import {
  formatCompactNumber,
  formatRelativeTime,
} from "@/lib/xcom-formatters";

type PostCardProps = {
  post: CommunityPostRecord & {
    viewerHasLiked?: boolean;
    viewerHasReposted?: boolean;
  };
  interaction?: {
    communitySlug: string;
    redirectTo: string;
    canInteract: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPin: boolean;
    isEditing: boolean;
    editHref: string;
  };
};

export const PostCard = ({ post, interaction }: PostCardProps) => {
  return (
    <article className="group/post border-b border-white/[0.08] px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-6">
      {/* Pinned indicator */}
      {post.isPinned ? (
        <div className="mb-1.5 flex items-center gap-2 pl-[52px] text-[13px] font-bold text-copy-muted">
          <Pin className="size-3 fill-current" />
          <span>Pinned</span>
        </div>
      ) : null}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link
          href={`/communities/${post.communitySlug}`}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white ring-0 ring-white/10 transition hover:ring-2"
        >
          {post.author.avatar}
        </Link>

        <div className="min-w-0 flex-1">
          {/* Author line */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-[15px] leading-5">
              <Link
                href={`/communities/${post.communitySlug}`}
                className="truncate font-bold text-white hover:underline"
              >
                {post.author.displayName}
              </Link>
              {post.author.verified ? (
                <BadgeCheck className="size-[18px] shrink-0 fill-accent-secondary text-background" />
              ) : null}
              {post.author.role && post.author.role !== "member" ? (
                <span className="ml-0.5 hidden shrink-0 items-center rounded bg-accent-secondary/15 px-1.5 py-px text-[11px] font-bold uppercase tracking-wide text-accent-secondary sm:inline-flex">
                  {post.author.role}
                </span>
              ) : null}
              <span className="hidden shrink-0 text-copy-muted sm:inline">{post.author.handle}</span>
              <span className="shrink-0 text-copy-soft">·</span>
              <time className="shrink-0 text-copy-muted hover:underline">
                {formatRelativeTime(post.createdAt)}
              </time>
            </div>

            {/* More menu */}
            {interaction &&
            (interaction.canEdit || interaction.canDelete || interaction.canPin) ? (
              <details className="group/menu relative shrink-0">
                <summary className="flex size-[34px] cursor-pointer list-none items-center justify-center rounded-full text-copy-soft transition hover:bg-accent-secondary/10 hover:text-accent-secondary">
                  <MoreHorizontal className="size-[18px]" />
                </summary>
                <div className="absolute right-0 top-full z-30 mt-0.5 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg shadow-black/40">
                  {interaction.canEdit && !interaction.isEditing ? (
                    <Link
                      href={interaction.editHref}
                      className="flex items-center gap-3 px-4 py-3 text-[15px] text-white transition hover:bg-white/[0.04]"
                    >
                      <Pencil className="size-[18px] text-copy-muted" />
                      Edit
                    </Link>
                  ) : null}
                  {interaction.canPin ? (
                    <form action={togglePinnedPostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                      <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 px-4 py-3 text-[15px] text-white transition hover:bg-white/[0.04]"
                      >
                        {post.isPinned ? (
                          <>
                            <PinOff className="size-[18px] text-copy-muted" />
                            Unpin from community
                          </>
                        ) : (
                          <>
                            <Pin className="size-[18px] text-copy-muted" />
                            Pin to community
                          </>
                        )}
                      </button>
                    </form>
                  ) : null}
                  {interaction.canDelete ? (
                    <form action={deletePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                      <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 px-4 py-3 text-[15px] text-danger-soft transition hover:bg-danger-soft/10"
                      >
                        <Trash2 className="size-[18px]" />
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>

          {/* Post body */}
          {interaction?.isEditing ? (
            <form action={updatePostAction} className="mt-3 grid gap-3">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
              <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
              <textarea
                name="body"
                rows={4}
                defaultValue={post.body}
                className="signal-focus w-full rounded-2xl border border-white/10 bg-surface-secondary/50 px-4 py-3 text-[15px] leading-6 text-white placeholder:text-copy-soft"
              />
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={interaction.redirectTo}
                  className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.06]"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="rounded-full bg-accent-secondary px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-0.5 whitespace-pre-line text-[15px] leading-[22px] text-white/[0.93]">
              {post.body}
            </div>
          )}

          {/* Media attachment */}
          {post.media ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] transition hover:border-white/15">
              <div className="bg-surface-secondary/60">
                <div className="px-4 pt-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-secondary">
                  {post.media.kind}
                </div>
                <div className="mt-1 px-4 text-[17px] font-extrabold leading-tight text-white">
                  {post.media.title}
                </div>
                <p className="mt-1 max-w-2xl px-4 text-[14px] leading-5 text-copy-muted">
                  {post.media.subtitle}
                </p>
                <div className="mt-3 border-t border-white/[0.06] px-4 py-2.5 text-[12px] font-medium text-copy-soft">
                  {post.media.footer}
                </div>
              </div>
            </div>
          ) : null}

          {/* Interaction bar — Twitter-style layout */}
          <div className="-ml-2 mt-1 flex items-center justify-between sm:max-w-[425px]">
            {/* Reply */}
            <button
              type="button"
              className="group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] text-copy-muted transition hover:text-accent-secondary"
            >
              <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-secondary/10">
                <MessageCircle className="size-[18px]" />
              </span>
              <span className="-ml-1">{formatCompactNumber(post.metrics.replies)}</span>
            </button>

            {/* Repost */}
            {interaction?.canInteract ? (
              <form action={toggleRepostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                <button
                  type="submit"
                  className={`group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] transition ${
                    post.viewerHasReposted
                      ? "text-accent-tertiary"
                      : "text-copy-muted hover:text-accent-tertiary"
                  }`}
                >
                  <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-tertiary/10">
                    <Repeat2 className="size-[18px]" />
                  </span>
                  <span className="-ml-1">{formatCompactNumber(post.metrics.reposts)}</span>
                </button>
              </form>
            ) : (
              <div className="flex min-w-[52px] items-center gap-1.5 px-2 py-1.5 text-[13px] text-copy-muted">
                <span className="flex size-[34px] items-center justify-center">
                  <Repeat2 className="size-[18px]" />
                </span>
                <span className="-ml-1">{formatCompactNumber(post.metrics.reposts)}</span>
              </div>
            )}

            {/* Like */}
            {interaction?.canInteract ? (
              <form action={toggleLikeAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                <button
                  type="submit"
                  className={`group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] transition ${
                    post.viewerHasLiked
                      ? "text-accent-primary"
                      : "text-copy-muted hover:text-accent-primary"
                  }`}
                >
                  <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-primary/10">
                    <Heart
                      className={`size-[18px] transition-transform ${
                        post.viewerHasLiked ? "scale-110 fill-current" : "group-hover/btn:scale-110"
                      }`}
                    />
                  </span>
                  <span className="-ml-1">{formatCompactNumber(post.metrics.likes)}</span>
                </button>
              </form>
            ) : (
              <div className="flex min-w-[52px] items-center gap-1.5 px-2 py-1.5 text-[13px] text-copy-muted">
                <span className="flex size-[34px] items-center justify-center">
                  <Heart className="size-[18px]" />
                </span>
                <span className="-ml-1">{formatCompactNumber(post.metrics.likes)}</span>
              </div>
            )}

            {/* Views */}
            <div className="group/btn flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] text-copy-muted transition hover:text-accent-secondary">
              <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-secondary/10">
                <BarChart3 className="size-[18px]" />
              </span>
              <span className="-ml-1">{formatCompactNumber(post.metrics.views)}</span>
            </div>

            {/* Share & Bookmark */}
            <div className="flex items-center gap-0">
              <button
                type="button"
                className="group/btn flex items-center rounded-full p-1.5 text-copy-muted transition hover:text-accent-secondary"
              >
                <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-secondary/10">
                  <Bookmark className="size-[18px]" />
                </span>
              </button>
              <button
                type="button"
                className="group/btn flex items-center rounded-full p-1.5 text-copy-muted transition hover:text-accent-secondary"
              >
                <span className="flex size-[34px] items-center justify-center rounded-full transition group-hover/btn:bg-accent-secondary/10">
                  <Upload className="size-[18px]" />
                </span>
              </button>
            </div>
          </div>

          {/* Replies thread */}
          {post.replies.length ? (
            <div className="mt-1 border-t border-white/[0.06] pt-3">
              <div className="ml-2 border-l-2 border-white/[0.08] pl-4">
                <div className="space-y-3">
                  {post.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-bold text-white">
                        {reply.author.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="text-[13px] font-bold text-white">
                            {reply.author.displayName}
                          </span>
                          {reply.author.verified ? (
                            <BadgeCheck className="size-3.5 fill-accent-secondary text-background" />
                          ) : null}
                          <span className="text-[12px] text-copy-muted">
                            {reply.author.handle}
                          </span>
                          <span className="text-[12px] text-copy-soft">
                            · {formatRelativeTime(reply.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 whitespace-pre-line text-[14px] leading-5 text-white/90">
                          {reply.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Reply form */}
          {interaction?.canInteract && !interaction.isEditing ? (
            <form
              action={createReplyAction}
              className="mt-2 flex items-center gap-2.5 border-t border-white/[0.06] pt-3"
            >
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
              <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  name="body"
                  className="signal-focus w-full rounded-full border border-white/[0.08] bg-surface-secondary/50 px-4 py-2 text-[14px] text-white placeholder:text-copy-soft"
                  placeholder="Post your reply"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-accent-secondary px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                Reply
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
};
