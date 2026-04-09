import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Repeat2,
  Share,
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

const syncStatusConfig = {
  draft: { label: "Draft", className: "text-copy-soft" },
  pending: { label: "Syncing to X", className: "text-amber-400/70" },
  published: { label: "Published on X", className: "text-accent-tertiary/70" },
  failed: { label: "X sync failed", className: "text-red-400/70" },
} as const;

export const PostCard = ({ post, interaction }: PostCardProps) => {
  const syncConfig = syncStatusConfig[post.xSyncStatus];

  return (
    <article className="signal-divider px-4 py-3 transition-colors hover:bg-white/[0.015] last:border-b-0 sm:px-6">
      {post.isPinned ? (
        <div className="mb-2 flex items-center gap-2 pl-[52px] text-[13px] font-medium text-copy-muted">
          <Pin className="size-3.5 rotate-45" />
          <span>Pinned</span>
        </div>
      ) : null}

      <div className="flex gap-3">
        <Link
          href={`/communities/${post.communitySlug}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white transition hover:brightness-110"
        >
          {post.author.avatar}
        </Link>

        <div className="min-w-0 flex-1">
          {/* Author line */}
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[15px]">
              <span className="font-bold text-white">{post.author.displayName}</span>
              {post.author.verified ? (
                <BadgeCheck className="size-[18px] fill-accent-secondary text-background" />
              ) : null}
              <span className="text-copy-muted">{post.author.handle}</span>
              <span className="text-copy-soft">·</span>
              <span className="text-copy-muted">{formatRelativeTime(post.createdAt)}</span>
            </div>
            {interaction && (interaction.canEdit || interaction.canDelete || interaction.canPin) ? (
              <div className="shrink-0">
                <MoreHorizontal className="size-5 text-copy-soft transition hover:text-accent-secondary" />
              </div>
            ) : null}
          </div>

          {/* Role badge */}
          {post.author.role && post.author.role !== "member" ? (
            <div className="mt-0.5">
              <span className="inline-flex items-center rounded-sm bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-copy-muted">
                {post.author.role}
              </span>
            </div>
          ) : null}

          {/* Post body */}
          {interaction?.isEditing ? (
            <form action={updatePostAction} className="mt-2 grid gap-3">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
              <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
              <textarea
                name="body"
                rows={4}
                defaultValue={post.body}
                className="signal-focus w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-[15px] leading-6 text-white placeholder:text-copy-soft"
              />
              <div className="flex items-center justify-end gap-3">
                <Link
                  href={interaction.redirectTo}
                  className="rounded-full border border-white/10 bg-background px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.06]"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="rounded-full bg-accent-secondary px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-1 whitespace-pre-line text-[15px] leading-[22px] text-white/95">
              {post.body}
            </div>
          )}

          {/* Media attachment */}
          {post.media ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-surface-secondary">
              <div className="px-4 pt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-secondary">
                {post.media.kind}
              </div>
              <div className="mt-1.5 px-4 text-[17px] font-extrabold leading-tight text-white">
                {post.media.title}
              </div>
              <p className="mt-1.5 max-w-2xl px-4 text-[14px] leading-5 text-copy-muted">
                {post.media.subtitle}
              </p>
              <div className="mt-3 border-t border-white/10 px-4 py-2.5 text-[12px] font-medium text-copy-soft">
                {post.media.footer}
              </div>
            </div>
          ) : null}

          {/* X sync status */}
          <div className={`mt-2 text-[12px] ${syncConfig.className}`}>
            {syncConfig.label}
          </div>

          {/* Action buttons */}
          {interaction &&
          (interaction.canEdit || interaction.canDelete || interaction.canPin) ? (
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-[0.16em] text-copy-muted">
              {interaction.canEdit && !interaction.isEditing ? (
                <Link href={interaction.editHref} className="transition hover:text-white">
                  Edit
                </Link>
              ) : null}
              {interaction.canPin ? (
                <form action={togglePinnedPostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                  <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                  <button type="submit" className="transition hover:text-white">
                    {post.isPinned ? "Unpin" : "Pin"}
                  </button>
                </form>
              ) : null}
              {interaction.canDelete ? (
                <form action={deletePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                  <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                  <button type="submit" className="transition hover:text-red-400">
                    Delete
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {/* Interaction bar */}
          <div className="-ml-2 mt-1 flex max-w-[425px] items-center justify-between">
            <div className="flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-2 text-[13px] text-copy-muted transition hover:bg-accent-secondary/10 hover:text-accent-secondary">
              <MessageCircle className="size-[18px]" />
              <span>{formatCompactNumber(post.metrics.replies)}</span>
            </div>

            {interaction?.canInteract ? (
              <form action={toggleRepostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                <button
                  type="submit"
                  className={`flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-2 text-[13px] transition ${
                    post.viewerHasReposted
                      ? "text-accent-tertiary"
                      : "text-copy-muted hover:bg-accent-tertiary/10 hover:text-accent-tertiary"
                  }`}
                >
                  <Repeat2 className="size-[18px]" />
                  <span>{formatCompactNumber(post.metrics.reposts)}</span>
                </button>
              </form>
            ) : (
              <div className="flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-2 text-[13px] text-copy-muted">
                <Repeat2 className="size-[18px]" />
                <span>{formatCompactNumber(post.metrics.reposts)}</span>
              </div>
            )}

            {interaction?.canInteract ? (
              <form action={toggleLikeAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                <button
                  type="submit"
                  className={`flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-2 text-[13px] transition ${
                    post.viewerHasLiked
                      ? "text-accent-primary"
                      : "text-copy-muted hover:bg-accent-primary/10 hover:text-accent-primary"
                  }`}
                >
                  <Heart className={`size-[18px] ${post.viewerHasLiked ? "fill-current" : ""}`} />
                  <span>{formatCompactNumber(post.metrics.likes)}</span>
                </button>
              </form>
            ) : (
              <div className="flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-2 text-[13px] text-copy-muted">
                <Heart className="size-[18px]" />
                <span>{formatCompactNumber(post.metrics.likes)}</span>
              </div>
            )}

            <div className="flex min-w-[52px] items-center gap-1.5 rounded-full px-2 py-2 text-[13px] text-copy-muted transition hover:bg-accent-secondary/10 hover:text-accent-secondary">
              <BarChart3 className="size-[18px]" />
              <span>{formatCompactNumber(post.metrics.views)}</span>
            </div>

            <div className="flex items-center rounded-full px-2 py-2 text-copy-muted transition hover:bg-accent-secondary/10 hover:text-accent-secondary">
              <Share className="size-[18px]" />
            </div>
          </div>

          {/* Replies thread */}
          {post.replies.length ? (
            <div className="mt-2 border-t border-white/[0.06] pt-3">
              <div className="ml-2 border-l-2 border-white/[0.06] pl-4">
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
              className="mt-3 flex items-start gap-2.5 border-t border-white/[0.06] pt-3"
            >
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
              <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
              <div className="min-w-0 flex-1">
                <textarea
                  name="body"
                  rows={1}
                  className="signal-focus w-full resize-none rounded-2xl border border-white/10 bg-transparent px-4 py-2.5 text-[14px] leading-5 text-white placeholder:text-copy-soft"
                  placeholder="Post your reply"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-accent-secondary px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-110"
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
