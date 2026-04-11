const X_API_BASE = "https://api.x.com/2";
const X_UPLOAD_BASE = "https://api.x.com/2";

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
  const text = await response.text();

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = JSON.parse(text);
    } catch {
      errorDetails = text;
    }
    throw new XAPIError(response.status, `X API error: ${response.statusText}`, errorDetails);
  }

  return JSON.parse(text);
};

/**
 * Upload media (image) to X via v2 media upload endpoint.
 * Returns the media_id to attach to a tweet.
 *
 * Sends binary image as multipart/form-data with:
 *   - media: binary file blob
 *   - media_category: "tweet_image"
 */
export const uploadMedia = async (
  accessToken: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> => {
  // Strip data URL prefix and convert base64 to binary
  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
  const binaryBuffer = Buffer.from(base64Data, "base64");

  // Determine file extension from mime type
  const ext = mimeType.split("/")[1] ?? "jpg";

  const blob = new Blob([binaryBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append("media", blob, `image.${ext}`);
  formData.append("media_category", "tweet_image");

  console.log(`[x-sync] Uploading media via v2, mimeType=${mimeType}, binarySize=${binaryBuffer.length}`);

  const response = await fetch(`${X_UPLOAD_BASE}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorDetails: unknown;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = responseText;
    }
    console.error(`[x-api] uploadMedia error ${response.status}:`, responseText.slice(0, 500));
    throw new XAPIError(response.status, `X Media Upload error: ${response.statusText}`, errorDetails);
  }

  const data = JSON.parse(responseText);
  console.log("[x-api] uploadMedia FULL response:", responseText.slice(0, 1000));
  // v2 may wrap in { data: { id: ... } }, v1.1 returns { media_id_string: ... }
  const inner = data.data ?? data;
  const mediaId = inner.media_id_string ?? inner.id ?? inner.media_id ?? data.media_id_string ?? data.id ?? data.media_id;
  console.log("[x-api] uploadMedia resolved mediaId:", mediaId, "keys:", Object.keys(data));
  if (!mediaId) {
    throw new XAPIError(0, "Upload succeeded but no media_id in response", data);
  }
  return String(mediaId);
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
