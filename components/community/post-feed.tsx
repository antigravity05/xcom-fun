"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PostCard } from "@/components/community/post-card";
import type { CommunityPostRecord } from "@/lib/xcom-domain";

const POSTS_PER_PAGE = 20;

type PostFeedProps = {
  posts: Array<
    CommunityPostRecord & {
      viewerHasLiked: boolean;
      viewerHasReposted: boolean;
    }
  >;
  communitySlug: string;
  activeTab: string;
  canInteract: boolean;
  viewerHandle: string | null;
  viewerRole: string | null;
  editingPostId: string | null;
  viewer?: { displayName: string; avatar?: string } | null;
};

export function PostFeed({
  posts,
  communitySlug,
  activeTab,
  canInteract,
  viewerHandle,
  viewerRole,
  editingPostId,
  viewer,
}: PostFeedProps) {
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + POSTS_PER_PAGE);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (posts.length === 0) {
    const isMediaTab = activeTab === "media";
    return (
      <div className="px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/[0.04]">
          {isMediaTab ? (
            <svg className="size-7 text-copy-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          ) : (
            <svg className="size-7 text-copy-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </div>
        <div className="mt-4 text-[16px] font-bold text-white">
          {isMediaTab ? "No media yet" : "No posts yet"}
        </div>
        <div className="mt-1.5 text-[14px] text-copy-muted">
          {isMediaTab
            ? "Posts with images will show up here."
            : "Be the first to share something with this community."}
        </div>
      </div>
    );
  }

  return (
    <>
      {visiblePosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          viewer={viewer}
          interaction={{
            communitySlug,
            redirectTo: `/communities/${communitySlug}?tab=${activeTab}`,
            canInteract,
            canEdit: viewerHandle === post.author.handle,
            canDelete:
              viewerHandle === post.author.handle ||
              viewerRole === "admin" ||
              viewerRole === "moderator",
            canPin: viewerRole === "admin" || viewerRole === "moderator",
            isEditing: editingPostId === post.id,
            editHref: `/communities/${communitySlug}?tab=${activeTab}&editing=${post.id}`,
          }}
        />
      ))}

      {/* Infinite scroll sentinel */}
      {hasMore ? (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-accent-secondary" />
        </div>
      ) : null}
    </>
  );
}
