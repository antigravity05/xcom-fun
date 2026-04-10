"use client";

import { useState } from "react";
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
};

export function PostFeed({
  posts,
  communitySlug,
  activeTab,
  canInteract,
  viewerHandle,
  viewerRole,
  editingPostId,
}: PostFeedProps) {
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  if (posts.length === 0) {
    return (
      <div className="px-4 py-12 text-center sm:px-6">
        <div className="text-[15px] font-medium text-copy-muted">
          No posts yet
        </div>
        <div className="mt-1 text-[13px] text-copy-soft">
          Be the first to share something with this community.
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

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + POSTS_PER_PAGE)}
          className="w-full border-t border-white/[0.08] py-4 text-center text-[15px] font-bold text-accent-secondary transition hover:bg-white/[0.02]"
        >
          Show more posts
        </button>
      )}
    </>
  );
}
