import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Heart,
  Pencil,
  Pin,
  PinOff,
  Repeat2,
  Trash2,
} from "lucide-react";
import {
  deletePostAction,
  togglePinnedPostAction,
  updatePostAction,
} from "@/app/xcom-actions";
import type { CommunityPostRecord } from "@/lib/xcom-domain";
import {
  formatCompactNumber,
  formatRelativeTime,
} from "@/lib/xcom-formatters";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { ReplyButton } from "@/components/community/reply-button";
import { PostBody } from "@/components/community/post-body";
import { BookmarkButton, ShareButton } from "@/components/community/post-actions";
import { LikeButton } from "@/components/community/like-button";
import { ConnectCTAWrapper } from "@/components/community/connect-cta";
import { PostMenu } from "@/components/community/post-menu";
import { PostViewTracker } from "@/components/community/post-view-tracker";
import { RepostButton } from "@/components/community/repost-button";

type PostCardProps = {
  post: CommunityPostRecord & {
    viewerHasLiked?: boolean;
    viewerHasReposted?: boolean;
  };
  viewer?: { displayName: string; avatar?: string } | null;
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

export const PostCard = ({ post, viewer, interaction }: PostCardProps) => {
  // Build tweet URL: https://x.com/handle/status/tweetId
  // Native posts use post.externalPostId (set when sync to X completes).
  // Imported posts use post.imported.tweetId (set at import time).
  const tweetIdForLink = post.externalPostId ?? post.imported?.tweetId ?? null;
  const xTweetUrl =
    tweetIdForLink && post.author.handle
      ? `https://x.com/${post.author.handle.replace(/^@/, "")}/status/${tweetIdForLink}`
      : null;
  const isImported = Boolean(post.imported);

  return (
    <article className="group/post relative border-b border-white/[0.08] px-3 py-2.5 transition-colors hover:bg-white/[0.02] sm:px-6 sm:py-3">
      <PostViewTracker postId={post.id} />
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
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-white ring-0 ring-white/10 transition hover:ring-2 overflow-hidden"
        >
          {post.author.avatar?.startsWith("http") ? (
            <img src={post.author.avatar} alt={post.author.displayName} className="size-full object-cover" />
          ) : (
            post.author.displayName?.[0]?.toUpperCase() ?? "X"
          )}
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
              <span className="shrink-0 truncate text-copy-muted">
                {post.author.handle.startsWith("@")
                  ? post.author.handle
                  : `@${post.author.handle}`}
              </span>
              {isImported ? (
                <span
                  className="ml-0.5 hidden shrink-0 items-center gap-0.5 rounded bg-white/[0.06] px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-copy-muted sm:inline-flex"
                  title="Imported from X"
                >
                  <svg
                    className="size-2.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  from X
                </span>
              ) : null}
              <span className="shrink-0 text-copy-soft">·</span>
              {xTweetUrl ? (
                <a
                  href={xTweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-copy-muted hover:underline"
                >
                  <time>{formatRelativeTime(post.createdAt)}</time>
                </a>
              ) : (
                <time className="shrink-0 text-copy-muted">
                  {formatRelativeTime(post.createdAt)}
                </time>
              )}
              {/* X sync status indicator */}
              {post.xSyncStatus === "published" ? (
                <span className="shrink-0 text-copy-soft" title="Synced to X">
                  <svg className="size-3.5 inline-block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
              ) : post.xSyncStatus === "pending" ? (
                <span className="shrink-0 text-yellow-500/60" title="Syncing to X...">
                  <svg className="size-3.5 inline-block animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
              ) : post.xSyncStatus === "failed" ? (
                <span className="shrink-0 text-danger-soft/60" title="Failed to sync to X">
                  <svg className="size-3.5 inline-block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
              ) : null}
            </div>

            {/* More menu */}
            {interaction &&
            (interaction.canEdit || interaction.canDelete || interaction.canPin) ? (
              <PostMenu xTweetUrl={xTweetUrl}>
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
                      <FormSubmitButton
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
                      </FormSubmitButton>
                    </form>
                  ) : null}
                  {interaction.canDelete ? (
                    <form action={deletePostAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="communitySlug" value={interaction.communitySlug} />
                      <input type="hidden" name="redirectTo" value={interaction.redirectTo} />
                      <FormSubmitButton
                        className="flex w-full items-center gap-3 px-4 py-3 text-[15px] text-danger-soft transition hover:bg-danger-soft/10"
                      >
                        <Trash2 className="size-[18px]" />
                        Delete
                      </FormSubmitButton>
                    </form>
                  ) : null}
              </PostMenu>
            ) : (
              <PostMenu xTweetUrl={xTweetUrl}>
                {null}
              </PostMenu>
            )}
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
                <FormSubmitButton
                  className="rounded-full bg-accent-secondary px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
                  pendingChildren="Saving..."
                >
                  Save
                </FormSubmitButton>
              </div>
            </form>
          ) : xTweetUrl ? (
            <a
              href={xTweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block cursor-pointer"
            >
              <PostBody
                body={post.body}
                className="mt-0.5 text-[15px] leading-[22px] text-white/[0.93]"
              />
            </a>
          ) : (
            <PostBody
              body={post.body}
              className="mt-0.5 text-[15px] leading-[22px] text-white/[0.93]"
            />
          )}

          {/* Media attachment — X-style image grid */}
          {post.media?.kind === "images" ? (
            <div
              className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-white/[0.08] ${
                post.media.urls.length === 1
                  ? "grid-cols-1"
                  : post.media.urls.length === 3
                    ? "grid-cols-2 grid-rows-2"
                    : "grid-cols-2"
              }`}
              style={{
                height:
                  post.media.urls.length === 1
                    ? "auto"
                    : post.media.urls.length === 2
                      ? "280px"
                      : "280px",
              }}
            >
              {post.media.urls.map((url: string, i: number) => {
                const count = post.media?.kind === "images" ? post.media.urls.length : 0;
                let extraClass = "w-full h-full object-cover";
                if (count === 1) extraClass = "w-full object-cover max-h-[510px]";
                if (count === 3 && i === 0) extraClass = "w-full h-full object-cover row-span-2";
                return (
                  <img
                    key={i}
                    src={url}
                    alt={`Image ${i + 1}`}
                    className={extraClass}
                    loading="lazy"
                  />
                );
              })}
            </div>
          ) : post.media?.kind === "video" ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <video
                src={post.media.url}
                controls
                preload="metadata"
                playsInline
                className="w-full max-h-[510px]"
              />
            </div>
          ) : post.media ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] transition hover:border-white/15">
              <div className="bg-surface-secondary/60">
                <div className="px-4 pt-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-secondary">
                  {post.media.kind}
                </div>
                {"title" in post.media && (
                  <div className="mt-1 px-4 text-[17px] font-extrabold leading-tight text-white">
                    {post.media.title}
                  </div>
                )}
                {"subtitle" in post.media && (
                  <p className="mt-1 max-w-2xl px-4 text-[14px] leading-5 text-copy-muted">
                    {post.media.subtitle}
                  </p>
                )}
                {"footer" in post.media && (
                  <div className="mt-3 border-t border-white/[0.06] px-4 py-2.5 text-[12px] font-medium text-copy-soft">
                    {post.media.footer}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Quoted post embed */}
          {post.quotedPost && (
            <div className="mt-3 rounded-2xl border border-white/10 p-3 transition hover:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white overflow-hidden">
                  {post.quotedPost.author.avatar?.startsWith("http") ? (
                    <img src={post.quotedPost.author.avatar} alt="" className="size-full object-cover" />
                  ) : (
                    post.quotedPost.author.displayName[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-[13px] font-bold text-white">{post.quotedPost.author.displayName}</span>
                <span className="text-[13px] text-copy-muted">{post.quotedPost.author.handle}</span>
                <span className="text-[13px] text-copy-muted">· {formatRelativeTime(post.quotedPost.createdAt)}</span>
              </div>
              <p className="mt-1 text-[14px] leading-5 text-copy-soft line-clamp-4">
                {post.quotedPost.body}
              </p>
            </div>
          )}

          {/* Interaction bar — Twitter-style layout */}
          <div className="-ml-2 mt-1 flex items-center justify-between sm:max-w-[425px]">
            {/* Reply — opens modal like X */}
            <ReplyButton
              postId={post.id}
              communitySlug={interaction?.communitySlug ?? ""}
              redirectTo={interaction?.redirectTo ?? "/"}
              replyCount={post.metrics.replies}
              canInteract={interaction?.canInteract ?? false}
              originalPost={{
                authorName: post.author.displayName,
                authorHandle: post.author.handle ?? "",
                authorAvatar: post.author.avatar,
                body: post.body,
                createdAt: post.createdAt,
              }}
              viewer={viewer}
            />

            {/* Repost / Quote */}
            {interaction?.canInteract ? (
              <RepostButton
                postId={post.id}
                communitySlug={interaction.communitySlug}
                redirectTo={interaction.redirectTo}
                repostCount={post.metrics.reposts}
                viewerHasReposted={post.viewerHasReposted ?? false}
                quotedPost={{
                  authorHandle: post.author.handle ?? "",
                  authorName: post.author.displayName,
                  authorAvatar: post.author.avatar,
                  body: post.body,
                  createdAt: post.createdAt,
                }}
                viewer={viewer}
              />
            ) : (
              <ConnectCTAWrapper>
                <div className="flex min-w-[52px] items-center gap-1.5 px-2 py-1.5 text-[13px] text-copy-muted hover:text-accent-tertiary transition">
                  <span className="flex size-[34px] items-center justify-center">
                    <Repeat2 className="size-[18px]" />
                  </span>
                  <span className="-ml-1">{formatCompactNumber(post.metrics.reposts)}</span>
                </div>
              </ConnectCTAWrapper>
            )}

            {/* Like */}
            {interaction?.canInteract ? (
              <LikeButton
                postId={post.id}
                communitySlug={interaction.communitySlug}
                redirectTo={interaction.redirectTo}
                likeCount={post.metrics.likes}
                viewerHasLiked={post.viewerHasLiked ?? false}
              />
            ) : (
              <ConnectCTAWrapper>
                <div className="flex min-w-[52px] items-center gap-1.5 px-2 py-1.5 text-[13px] text-copy-muted hover:text-accent-primary transition">
                  <span className="flex size-[34px] items-center justify-center">
                    <Heart className="size-[18px]" />
                  </span>
                  <span className="-ml-1">{formatCompactNumber(post.metrics.likes)}</span>
                </div>
              </ConnectCTAWrapper>
            )}

            {/* Views */}
            <div className="flex min-w-[52px] items-center gap-1.5 px-2 py-1.5 text-[13px] text-copy-muted">
              <span className="flex size-[34px] items-center justify-center">
                <BarChart3 className="size-[18px]" />
              </span>
              <span className="-ml-1">{formatCompactNumber(post.metrics.views)}</span>
            </div>

            {/* Bookmark & Share */}
            <div className="flex items-center gap-0.5">
              <BookmarkButton />
              <ShareButton
                communitySlug={post.communitySlug ?? interaction?.communitySlug ?? ""}
                postId={post.id}
              />
            </div>
          </div>

          {/* Replies thread */}
          {post.replies.length ? (
            <div className="mt-1 border-t border-white/[0.06] pt-3">
              <div className="ml-2 border-l-2 border-white/[0.08] pl-4">
                <div className="space-y-3">
                  {post.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[10px] font-bold text-white overflow-hidden">
                        {reply.author.avatar?.startsWith("http") ? (
                          <img src={reply.author.avatar} alt={reply.author.displayName} className="size-full object-cover" />
                        ) : (
                          reply.author.displayName?.[0]?.toUpperCase() ?? "X"
                        )}
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
                        <PostBody
                          body={reply.body}
                          className="mt-0.5 text-[14px] leading-5 text-white/90"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Reply form removed — replies now go through the modal */}
        </div>
      </div>
    </article>
  );
};
