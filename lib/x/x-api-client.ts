const X_API_BASE = "https://api.x.com/2";

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

export const postTweet = async (
  accessToken: string,
  text: string
): Promise<{ id: string; text: string }> => {
  const response = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
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
