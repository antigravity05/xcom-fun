"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.body.toLowerCase().includes(query) ||
        post.author.displayName.toLowerCase().includes(query) ||
        post.author.handle?.toLowerCase().includes(query),
    );
  }, [posts, searchQuery]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

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
      {/* Search bar — only show when there are enough posts */}
      {posts.length > 3 ? (
        <div className="border-b border-white/[0.08] px-4 py-2.5 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-copy-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(POSTS_PER_PAGE);
              }}
              placeholder="Search posts..."
              className="w-full rounded-full border border-white/[0.08] bg-surface-secondary/50 py-2 pl-9 pr-4 text-[14px] text-white placeholder:text-copy-soft focus:border-accent-secondary/40 focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {searchQuery && filteredPosts.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-6">
          <div className="text-[15px] text-copy-muted">
            No posts matching &ldquo;{searchQuery}&rdquo;
          </div>
        </div>
      ) : null}

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
