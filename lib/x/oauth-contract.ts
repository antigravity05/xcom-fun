/**
 * Checks whether the X integration environment is configured.
 * Now powered by Zernio — requires ZERNIO_API_KEY at minimum.
 * ZERNIO_PROFILE_ID is only needed for OAuth connect flows.
 * Falls back to checking the legacy X_CLIENT_ID vars for backward compat.
 */
export const hasXOAuthEnvironment = () => {
  // Prefer Zernio — only API key needed for posting/engagement
  if (process.env.ZERNIO_API_KEY) {
    return true;
  }
  // Legacy direct X OAuth (kept for reference)
  return Boolean(
    process.env.X_CLIENT_ID &&
      process.env.X_CLIENT_SECRET &&
      process.env.X_CALLBACK_URL,
  );
};

/**
 * Returns true when Zernio is the active publishing backend.
 * Only requires ZERNIO_API_KEY — the profile ID is only needed
 * for the OAuth connect flow (getTwitterConnectUrl), not for
 * posting, liking, replying, or retweeting.
 */
export const isZernioMode = () => {
  return Boolean(process.env.ZERNIO_API_KEY);
};
