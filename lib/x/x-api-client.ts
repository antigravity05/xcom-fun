const X_API_BASE = "https://api.x.com/2";
const X_UPLOAD_BASE = "https://upload.twitter.com/1.1";

export interface XTweetResponse {
  data: {
    id: string;
    text: string;
  };
}

export class XAPIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errorDetails?: unknown
  ) {
    super(message);
    this.name = "XAPIError";
  }
}

const handleXAPIResponse = async (response: Response) => {
  if (!response.ok) {
    let errorDetails: unknown;

    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }

    throw new XAPIError(response.status, `X API error: ${response.statusText}`, errorDetails);
  }

  return response.json();
};

/**
 * Upload media (image) to X via v1.1 media upload endpoint.
 * Returns the media_id_string to attach to a tweet.
 */
export const uploadMedia = async (
  accessToken: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> => {
  // Strip data URL prefix if present
  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");

  const formData = new FormData();
  formData.append("media_data", base64Data);
  formData.append("media_category", "tweet_image");

  const response = await fetch(`${X_UPLOAD_BASE}/media/upload.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }
    throw new XAPIError(response.status, `X Media Upload error: ${response.statusText}`, errorDetails);
  }

  const data = await response.json();
  console.log("[x-api] uploadMedia response:", JSON.stringify(data));
  return data.media_id_string;
};

export const postTweet = async (
  accessToken: string,
  text: string,
  mediaIds?: string[],
): Promise<{ id: string; text: string }> => {
  const payload: Record<string, unknown> = { text };
  if (mediaIds && mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }

  const response = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await handleXAPIResponse(response)) as XTweetResponse;
  return data.data;
};

export const deleteTweet = async (
  accessToken: string,
  tweetId: string
): Promise<boolean> => {
  const response = await fetch(`${X_API_BASE}/tweets/${tweetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleXAPIResponse(response);
  return true;
};

export const retweet = async (
  accessToken: string,
  userId: string,
  tweetId: string
): Promise<boolean> => {
  const response = await fetch(`${X_API_BASE}/users/${userId}/retweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tweet_id: tweetId }),
  });

  await handleXAPIResponse(response);
  return true;
};

export const undoRetweet = async (
  accessToken: string,
  userId: string,
  tweetId: string
): Promise<boolean> => {
  const response = await fetch(
    `${X_API_BASE}/users/${userId}/retweets/${tweetId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  await handleXAPIResponse(response);
  return true;
};

/**
 * Reply to a tweet via X API v2.
 * POST /2/tweets with reply.in_reply_to_tweet_id
 */
export const replyToTweet = async (
  accessToken: string,
  inReplyToTweetId: string,
  text: string
): Promise<{ id: string; text: string }> => {
  const response = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: inReplyToTweetId },
    }),
  });

  const data = (await handleXAPIResponse(response)) as XTweetResponse;
  return data.data;
};

/**
 * Like a tweet via X API v2.
 * POST /2/users/:userId/likes
 */
export const likeTweet = async (
  accessToken: string,
  userId: string,
  tweetId: string
): Promise<boolean> => {
  const response = await fetch(`${X_API_BASE}/users/${userId}/likes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tweet_id: tweetId }),
  });

  await handleXAPIResponse(response);
  return true;
};

/**
 * Unlike a tweet via X API v2.
 * DELETE /2/users/:userId/likes/:tweetId
 */
export const unlikeTweet = async (
  accessToken: string,
  userId: string,
  tweetId: string
): Promise<boolean> => {
  const response = await fetch(
    `${X_API_BASE}/users/${userId}/likes/${tweetId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  await handleXAPIResponse(response);
  return true;
};
