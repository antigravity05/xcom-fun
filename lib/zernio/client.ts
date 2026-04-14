import "server-only";

/**
 * Zernio API client — unified social media API.
 * Replaces direct X/Twitter API integration.
 *
 * Docs: https://docs.zernio.com
 */

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

const getApiKey = (): string => {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) {
    throw new Error("ZERNIO_API_KEY environment variable is required");
  }
  return key;
};

const getProfileId = (): string => {
  const id = process.env.ZERNIO_PROFILE_ID;
  if (!id) {
    throw new Error("ZERNIO_PROFILE_ID environment variable is required");
  }
  return id;
};

/* ── Helpers ── */

class ZernioAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ZernioAPIError";
  }
}

const zernioFetch = async (
  path: string,
  options: RequestInit = {},
): Promise<unknown> => {
  const url = `${ZERNIO_API_BASE}${path}`;
  console.log(`[zernio] ${options.method ?? "GET"} ${path}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    console.error(`[zernio] ${options.method ?? "GET"} ${path} → ${response.status}`, details);
    throw new ZernioAPIError(
      response.status,
      `Zernio API error: ${response.statusText}`,
      details,
    );
  }

  const data = await response.json();
  console.log(`[zernio] ${options.method ?? "GET"} ${path} → ${response.status} OK`);
  return data;
};

/* ── Environment check ── */

export const hasZernioEnvironment = (): boolean => {
  return Boolean(process.env.ZERNIO_API_KEY && process.env.ZERNIO_PROFILE_ID);
};

/* ── OAuth Connect ── */

/**
 * Calls the Zernio API server-side to get the OAuth connect URL.
 * The API authenticates via Bearer token and returns an authUrl
 * that we then redirect the user to.
 *
 * Tries the profile ID as-is first. If that fails with "Invalid profile ID
 * format" and the ID starts with "prof_", retries with just the raw hex ID.
 */
export const getTwitterConnectUrl = async (
  redirectUrl: string,
): Promise<string> => {
  const profileId = getProfileId();
  const apiKey = getApiKey();

  const tryConnect = async (id: string): Promise<{ ok: boolean; authUrl?: string; error?: string; status: number; raw?: unknown }> => {
    const params = new URLSearchParams({
      profileId: id,
      redirect_url: redirectUrl,
    });

    const response = await fetch(
      `${ZERNIO_API_BASE}/connect/twitter?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }
      const errorMsg = typeof details === "object" && details !== null && "error" in details
        ? String((details as Record<string, unknown>).error)
        : String(details);
      return { ok: false, error: errorMsg, status: response.status, raw: details };
    }

    const data = (await response.json()) as { authUrl?: string; url?: string };
    const authUrl = data.authUrl ?? data.url;
    return { ok: true, authUrl: authUrl ?? undefined, status: response.status, raw: data };
  };

  // Attempt 1: use profileId as-is
  let result = await tryConnect(profileId);

  // Attempt 2: if failed and has prof_ prefix, retry without it
  if (!result.ok && profileId.startsWith("prof_")) {
    const rawId = profileId.slice(5);
    console.log(`[zernio] Retrying connect without prof_ prefix: ${rawId}`);
    result = await tryConnect(rawId);
  }

  // Attempt 3: if failed and does NOT have prof_ prefix, retry with it
  if (!result.ok && !profileId.startsWith("prof_")) {
    const prefixedId = `prof_${profileId}`;
    console.log(`[zernio] Retrying connect with prof_ prefix: ${prefixedId}`);
    result = await tryConnect(prefixedId);
  }

  if (!result.ok) {
    throw new ZernioAPIError(
      result.status,
      `Zernio connect error: ${result.error}`,
      result.raw,
    );
  }

  if (!result.authUrl) {
    throw new Error(
      "Zernio connect response missing authUrl: " + JSON.stringify(result.raw),
    );
  }

  return result.authUrl;
};

/* ── Accounts ── */

export type ZernioAccount = {
  id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profileId: string;
  avatarUrl?: string;
  profileImageUrl?: string;
  avatar?: string;
};

/**
 * List all connected social accounts for the profile.
 */
export const listAccounts = async (): Promise<ZernioAccount[]> => {
  const data = (await zernioFetch("/accounts")) as {
    accounts: ZernioAccount[];
  };
  return data.accounts ?? [];
};

/**
 * Find a connected Twitter account by username (handle without @).
 */
export const findTwitterAccount = async (
  username: string,
): Promise<ZernioAccount | null> => {
  const accounts = await listAccounts();
  const clean = username.replace(/^@/, "").toLowerCase();
  return (
    accounts.find(
      (a) =>
        a.platform === "twitter" &&
        a.username?.toLowerCase() === clean,
    ) ?? null
  );
};

/* ── Posting ── */

export type ZernioPlatformResult = {
  platform: string;
  /** The actual Twitter tweet ID */
  platformPostId?: string;
  /** Full URL to the tweet */
  platformPostUrl?: string;
  /** Legacy field name (some endpoints) */
  postId?: string;
  status: string;
  error?: string;
  _id?: string;
};

export type ZernioPostResult = {
  /** Zernio internal post ID (_id) */
  id: string;
  _id?: string;
  status: string;
  platforms?: ZernioPlatformResult[];
};

/**
 * Publish a tweet via Zernio on behalf of a connected account.
 * Supports optional image attachments (up to 4) or a single video via
 * mediaItems (public URLs). X only allows image OR video per tweet,
 * not both, so the video takes precedence if passed.
 */
export const postTweet = async (
  accountId: string,
  content: string,
  imageUrls?: string[],
  videoUrl?: string,
): Promise<ZernioPostResult> => {
  // Build the post payload
  const payload: Record<string, unknown> = {
    content,
    platforms: [
      {
        platform: "twitter",
        accountId,
        platformSpecificData: {},
      },
    ],
    publishNow: true,
  };

  // Attach media via mediaItems (public URLs). Video takes precedence.
  if (videoUrl) {
    payload.mediaItems = [{ type: "video", url: videoUrl }];
    console.log(`[zernio] postTweet: attaching video:`, videoUrl);
  } else if (imageUrls && imageUrls.length > 0) {
    payload.mediaItems = imageUrls.slice(0, 4).map((url) => ({
      type: "image",
      url,
    }));
    console.log(`[zernio] postTweet: attaching ${imageUrls.length} image(s):`, imageUrls);
  }

  const raw = (await zernioFetch("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as Record<string, unknown>;

  // Log full response to understand the shape
  console.log("[zernio] postTweet raw response:", JSON.stringify(raw));

  // Zernio may nest the result under "post", "data", or return it at root
  const post = (raw.post ?? raw.data ?? raw) as ZernioPostResult;
  return post;
};

/* ── Engagement ── */

export const likeTweet = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  await zernioFetch("/twitter/like", {
    method: "POST",
    body: JSON.stringify({ accountId, tweetId }),
  });
};

export const unlikeTweet = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  await zernioFetch("/twitter/like", {
    method: "DELETE",
    body: JSON.stringify({ accountId, tweetId }),
  });
};

export const retweetPost = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  // Zernio /twitter/retweet returns 500 for own tweets.
  // Fall back to quote tweet via /posts endpoint which is reliable.
  try {
    await zernioFetch("/twitter/retweet", {
      method: "POST",
      body: JSON.stringify({ accountId, tweetId }),
    });
  } catch (err) {
    console.warn("[zernio] /twitter/retweet failed, trying quote tweet fallback:", err);
    // Quote tweet fallback via /posts with quoteTweetId
    await zernioFetch("/posts", {
      method: "POST",
      body: JSON.stringify({
        content: "",
        platforms: [
          {
            platform: "twitter",
            accountId,
            quoteTweetId: tweetId,
          },
        ],
        publishNow: true,
      }),
    });
  }
};

export const undoRetweet = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  await zernioFetch("/twitter/retweet", {
    method: "DELETE",
    body: JSON.stringify({ accountId, tweetId }),
  });
};

export const replyToTweet = async (
  accountId: string,
  tweetId: string,
  content: string,
): Promise<ZernioPostResult> => {
  // Zernio docs: replyToTweetId goes inside platformSpecificData
  const data = (await zernioFetch("/posts", {
    method: "POST",
    body: JSON.stringify({
      content,
      platforms: [
        {
          platform: "twitter",
          accountId,
          platformSpecificData: {
            replyToTweetId: tweetId,
          },
        },
      ],
      publishNow: true,
    }),
  })) as { post?: ZernioPostResult };

  console.log("[zernio] replyToTweet raw response:", JSON.stringify(data));
  return data.post ?? { id: "", status: "published" };
};

/**
 * List recent Zernio posts (used to find tweet IDs for older posts).
 */
export const listRecentPosts = async (): Promise<Array<{
  content: string;
  platformPostId: string | null;
  platformPostUrl: string | null;
  zernioId: string;
}>> => {
  try {
    const raw = (await zernioFetch("/posts", { method: "GET" })) as Record<string, unknown>;
    const posts = (raw.posts ?? raw.data ?? (Array.isArray(raw) ? raw : [])) as Array<Record<string, unknown>>;
    return posts.map((p) => {
      const twitterPlatform = (p.platforms as Array<Record<string, unknown>> | undefined)?.find(
        (pl) => pl.platform === "twitter",
      );
      return {
        content: String(p.content ?? ""),
        platformPostId: (twitterPlatform?.platformPostId as string) ?? null,
        platformPostUrl: (twitterPlatform?.platformPostUrl as string) ?? null,
        zernioId: String(p._id ?? p.id ?? ""),
      };
    });
  } catch (err) {
    console.error("[zernio] listRecentPosts failed:", err);
    return [];
  }
};

export const bookmarkTweet = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  await zernioFetch("/twitter/bookmark", {
    method: "POST",
    body: JSON.stringify({ accountId, tweetId }),
  });
};

export const removeBookmark = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  await zernioFetch("/twitter/bookmark", {
    method: "DELETE",
    body: JSON.stringify({ accountId, tweetId }),
  });
};
