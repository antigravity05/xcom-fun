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
  const response = await fetch(`${ZERNIO_API_BASE}${path}`, {
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
    throw new ZernioAPIError(
      response.status,
      `Zernio API error: ${response.statusText}`,
      details,
    );
  }

  return response.json();
};

/* ── Environment check ── */

export const hasZernioEnvironment = (): boolean => {
  return Boolean(process.env.ZERNIO_API_KEY && process.env.ZERNIO_PROFILE_ID);
};

/* ── OAuth Connect ── */

/**
 * Returns the Zernio OAuth connect URL for Twitter/X.
 * Redirect the user here — Zernio handles the full OAuth dance
 * and redirects back to our callback URL.
 */
export const getTwitterConnectUrl = (redirectUrl: string): string => {
  const profileId = getProfileId();
  const params = new URLSearchParams({
    profileId,
    redirect_url: redirectUrl,
  });
  return `${ZERNIO_API_BASE}/connect/twitter?${params.toString()}`;
};

/* ── Accounts ── */

export type ZernioAccount = {
  id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profileId: string;
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

export type ZernioPostResult = {
  id: string;
  status: string;
  platforms?: Array<{
    platform: string;
    postId?: string;
    status: string;
    error?: string;
  }>;
};

/**
 * Publish a tweet via Zernio on behalf of a connected account.
 */
export const postTweet = async (
  accountId: string,
  content: string,
): Promise<ZernioPostResult> => {
  const data = (await zernioFetch("/posts", {
    method: "POST",
    body: JSON.stringify({
      content,
      platforms: [
        {
          platform: "twitter",
          accountId,
        },
      ],
      publishNow: true,
    }),
  })) as { post: ZernioPostResult };

  return data.post;
};

/* ── Engagement ── */

export const retweetPost = async (
  accountId: string,
  tweetId: string,
): Promise<void> => {
  await zernioFetch("/twitter/retweet", {
    method: "POST",
    body: JSON.stringify({ accountId, tweetId }),
  });
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
