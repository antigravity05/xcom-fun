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
