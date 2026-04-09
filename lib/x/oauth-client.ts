import { randomBytes, createHash, pbkdf2Sync, createCipheriv, createDecipheriv } from "node:crypto";

const X_OAUTH_ENDPOINT = "https://x.com/i/oauth2/authorize";
const X_TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token";
const X_USERS_ME_ENDPOINT = "https://api.x.com/2/users/me";

export const generateCodeVerifier = (): string => {
  const length = 128;
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .substring(0, length);
};

export const generateCodeChallenge = (verifier: string): string => {
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

export const buildAuthorizationUrl = (
  codeChallenge: string,
  state: string,
): string => {
  const clientId = process.env.X_CLIENT_ID;
  const callbackUrl = process.env.X_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    throw new Error("X_CLIENT_ID and X_CALLBACK_URL environment variables are required");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${X_OAUTH_ENDPOINT}?${params.toString()}`;
};

export interface XAccessTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
): Promise<XAccessTokenResponse> => {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const callbackUrl = process.env.X_CALLBACK_URL;

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error(
      "X_CLIENT_ID, X_CLIENT_SECRET, and X_CALLBACK_URL environment variables are required"
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(X_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
};

export const refreshAccessToken = async (
  refreshToken: string,
): Promise<XAccessTokenResponse> => {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("X_CLIENT_ID and X_CLIENT_SECRET environment variables are required");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(X_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  return response.json();
};

export interface XUserProfile {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
}

export const getXUserProfile = async (accessToken: string): Promise<XUserProfile> => {
  const params = new URLSearchParams({
    "user.fields": "profile_image_url,username,name",
  });

  const response = await fetch(
    `${X_USERS_ME_ENDPOINT}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch user profile: ${error}`);
  }

  const data = await response.json() as { data: XUserProfile };
  return data.data;
};
