import { describe, expect, it } from "vitest";
import {
  createCommunity,
  deleteCommunity,
  deletePost,
  createPost,
  createReply,
  joinCommunity,
  leaveCommunity,
  setMemberRole,
  toggleRepost,
  togglePinnedPost,
  toggleLike,
  updateCommunity,
  updatePost,
} from "./xcom-operations";
import type { XcomStoreSnapshot } from "./xcom-store";

const baseState: XcomStoreSnapshot = {
  users: [
    {
      id: "user-admin",
      xUserId: "x-admin",
      xHandle: "@admin",
      displayName: "Admin",
      avatar: "A",
    },
    {
      id: "user-member",
      xUserId: "x-member",
      xHandle: "@member",
      displayName: "Member",
      avatar: "M",
    },
  ],
  communities: [
    {
      id: "community-alpha",
      slug: "alpha",
      name: "Alpha",
      ticker: "$ALPHA",
      tagline: "Alpha room",
      description: "Alpha community for testing.",
      rules: ["Post with context."],
      createdByUserId: "user-admin",
      memberCount: 1,
      createdAt: "2026-04-08T00:00:00.000Z",
    },
  ],
  memberships: [
    {
      id: "membership-admin",
      communityId: "community-alpha",
      userId: "user-admin",
      role: "admin",
      status: "active",
      createdAt: "2026-04-08T00:00:00.000Z",
    },
  ],
  posts: [],
  replies: [],
  reactions: [],
};

describe("xcom operations", () => {
  it("creates a community and makes the creator an active admin member", () => {
    const nextState = createCommunity(baseState, {
      actorUserId: "user-member",
      slug: "signal-room",
      name: "Signal Room",
      ticker: "SIG",
      tagline: "Fast signal room",
      description: "A room for disciplined signal distribution.",
      rules: ["Post with signal.", "No spam."],
      contractAddress: "0x1234567890",
    });

    const community = nextState.communities.find(
      (entry) => entry.slug === "signal-room",
    );
    const membership = nextState.memberships.find(
      (entry) =>
        entry.communityId === community?.id && entry.userId === "user-member",
    );

    expect(community).toBeDefined();
    expect(membership?.role).toBe("admin");
    expect(membership?.status).toBe("active");
  });

  it("lets an admin update a community name and description", () => {
    const updated = updateCommunity(baseState, {
      actorUserId: "user-admin",
      communitySlug: "alpha",
      name: "Alpha Prime",
      description: "Alpha Prime community for testing updated flows.",
    });

    expect(updated.communities[0]?.name).toBe("Alpha Prime");
    expect(updated.communities[0]?.description).toBe(
      "Alpha Prime community for testing updated flows.",
    );
  });

  it("blocks non-admins from updating a community", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    expect(() =>
      updateCommunity(withMember, {
        actorUserId: "user-member",
        communitySlug: "alpha",
        name: "Alpha Prime",
        description: "Alpha Prime community for testing updated flows.",
      }),
    ).toThrow(/admin/i);
  });

  it("prevents duplicate joins and increments member count only once", () => {
    const onceJoined = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });
    const joinedAgain = joinCommunity(onceJoined, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    expect(onceJoined.communities[0]?.memberCount).toBe(2);
    expect(joinedAgain.communities[0]?.memberCount).toBe(2);
    expect(
      joinedAgain.memberships.filter((entry) => entry.userId === "user-member"),
    ).toHaveLength(1);
  });

  it("lets an active member leave a community and updates the member count", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    const leftCommunity = leaveCommunity(withMember, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    expect(leftCommunity.communities[0]?.memberCount).toBe(1);
    expect(
      leftCommunity.memberships.find(
        (entry) =>
          entry.communityId === "community-alpha" &&
          entry.userId === "user-member" &&
          entry.status === "active",
      ),
    ).toBeUndefined();
  });

  it("prevents the last active admin from leaving a community", () => {
    expect(() =>
      leaveCommunity(baseState, {
        actorUserId: "user-admin",
        communitySlug: "alpha",
      }),
    ).toThrow(/admin/i);
  });

  it("requires active membership before creating a post", () => {
    expect(() =>
      createPost(baseState, {
        actorUserId: "user-member",
        communitySlug: "alpha",
        body: "gm builders",
      }),
    ).toThrow(/membership/i);
  });

  it("creates a post, a reply and toggles likes for active members", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    const withPost = createPost(withMember, {
      actorUserId: "user-member",
      communitySlug: "alpha",
      body: "gm builders",
    });

    const postId = withPost.posts[0]?.id;
    expect(postId).toBeDefined();

    const withReply = createReply(withPost, {
      actorUserId: "user-admin",
      postId: postId!,
      body: "welcome in",
    });

    expect(withReply.replies).toHaveLength(1);
    expect(withReply.posts[0]?.replyCount).toBe(1);

    const liked = toggleLike(withReply, {
      actorUserId: "user-admin",
      postId: postId!,
    });
    const unliked = toggleLike(liked, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    const reposted = toggleRepost(unliked, {
      actorUserId: "user-admin",
      postId: postId!,
    });
    const unreposted = toggleRepost(reposted, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    expect(liked.reactions).toHaveLength(1);
    expect(unliked.reactions).toHaveLength(0);
    expect(reposted.reactions).toHaveLength(1);
    expect(reposted.reactions[0]?.kind).toBe("repost");
    expect(reposted.reactions[0]?.xSyncStatus).toBe("pending");
    expect(reposted.posts[0]?.repostCount).toBe(1);
    expect(unreposted.reactions).toHaveLength(0);
    expect(unreposted.posts[0]?.repostCount).toBe(0);
  });

  it("lets the author edit a post and lets an admin delete it with its thread", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    const withPost = createPost(withMember, {
      actorUserId: "user-member",
      communitySlug: "alpha",
      body: "gm builders",
    });

    const postId = withPost.posts[0]?.id;
    expect(postId).toBeDefined();

    const updated = updatePost(withPost, {
      actorUserId: "user-member",
      postId: postId!,
      body: "gm builders, edited",
    });

    expect(updated.posts[0]?.body).toBe("gm builders, edited");
    expect(updated.posts[0]?.xSyncStatus).toBe("pending");

    const withReply = createReply(updated, {
      actorUserId: "user-admin",
      postId: postId!,
      body: "welcome in",
    });

    const withLike = toggleLike(withReply, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    const deleted = deletePost(withLike, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    expect(deleted.posts).toHaveLength(0);
    expect(deleted.replies).toHaveLength(0);
    expect(deleted.reactions).toHaveLength(0);
  });

  it("lets admins pin and unpin posts while blocking regular members", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    const withPost = createPost(withMember, {
      actorUserId: "user-member",
      communitySlug: "alpha",
      body: "gm builders",
    });

    const postId = withPost.posts[0]?.id;
    expect(postId).toBeDefined();

    expect(() =>
      togglePinnedPost(withPost, {
        actorUserId: "user-member",
        postId: postId!,
      }),
    ).toThrow(/pinned/i);

    const pinned = togglePinnedPost(withPost, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    expect(pinned.posts[0]?.isPinned).toBe(true);

    const unpinned = togglePinnedPost(pinned, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    expect(unpinned.posts[0]?.isPinned).toBe(false);
  });

  it("lets an admin promote a member to moderator and demote them back", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    const promoted = setMemberRole(withMember, {
      actorUserId: "user-admin",
      communitySlug: "alpha",
      targetUserId: "user-member",
      role: "moderator",
    });

    expect(
      promoted.memberships.find(
        (entry) =>
          entry.communityId === "community-alpha" &&
          entry.userId === "user-member",
      )?.role,
    ).toBe("moderator");

    const demoted = setMemberRole(promoted, {
      actorUserId: "user-admin",
      communitySlug: "alpha",
      targetUserId: "user-member",
      role: "member",
    });

    expect(
      demoted.memberships.find(
        (entry) =>
          entry.communityId === "community-alpha" &&
          entry.userId === "user-member",
      )?.role,
    ).toBe("member");
  });

  it("blocks non-admins from changing member roles", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    expect(() =>
      setMemberRole(withMember, {
        actorUserId: "user-member",
        communitySlug: "alpha",
        targetUserId: "user-admin",
        role: "moderator",
      }),
    ).toThrow(/admin/i);
  });

  it("lets an admin delete a community with its memberships, posts, replies and reactions", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    const withPost = createPost(withMember, {
      actorUserId: "user-member",
      communitySlug: "alpha",
      body: "gm builders",
    });

    const postId = withPost.posts[0]?.id;
    expect(postId).toBeDefined();

    const withReply = createReply(withPost, {
      actorUserId: "user-admin",
      postId: postId!,
      body: "welcome in",
    });

    const withLike = toggleLike(withReply, {
      actorUserId: "user-admin",
      postId: postId!,
    });

    const deleted = deleteCommunity(withLike, {
      actorUserId: "user-admin",
      communitySlug: "alpha",
    });

    expect(deleted.communities).toHaveLength(0);
    expect(deleted.memberships).toHaveLength(0);
    expect(deleted.posts).toHaveLength(0);
    expect(deleted.replies).toHaveLength(0);
    expect(deleted.reactions).toHaveLength(0);
  });

  it("blocks non-admins from deleting a community", () => {
    const withMember = joinCommunity(baseState, {
      actorUserId: "user-member",
      communitySlug: "alpha",
    });

    expect(() =>
      deleteCommunity(withMember, {
        actorUserId: "user-member",
        communitySlug: "alpha",
      }),
    ).toThrow(/admin/i);
  });
});
