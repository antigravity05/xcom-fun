/**
 * Checks whether the X integration environment is configured.
 * Now powered by Zernio — requires ZERNIO_API_KEY and ZERNIO_PROFILE_ID.
 * Falls back to checking the legacy X_CLIENT_ID vars for backward compat.
 */
export const hasXOAuthEnvironment = () => {
  // Prefer Zernio
  if (process.env.ZERNIO_API_KEY && process.env.ZERNIO_PROFILE_ID) {
    return true;
  }
  // Legacy direct X OAuth (kept for reference)
  return Boolean(
    process.env.X_CLIENT_ID &&
      process.env.X_CLIENT_SECRET &&
      process.env.X_CALLBACK_URL,
  );
};

export const isZernioMode = () => {
  return Boolean(process.env.ZERNIO_API_KEY && process.env.ZERNIO_PROFILE_ID);
};
