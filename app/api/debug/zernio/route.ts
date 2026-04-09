import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to list Zernio profiles and verify the API key works.
 * Hit GET /api/debug/zernio to see your real profile IDs.
 * DELETE THIS FILE before going to production.
 */
export async function GET() {
  const apiKey = process.env.ZERNIO_API_KEY;
  const profileId = process.env.ZERNIO_PROFILE_ID;

  if (!apiKey) {
    return NextResponse.json({ error: "ZERNIO_API_KEY not set" }, { status: 500 });
  }

  const results: Record<string, unknown> = {
    currentProfileId: profileId ?? "(not set)",
    apiKeyPrefix: apiKey.slice(0, 10) + "...",
  };

  // 1. List profiles
  try {
    const res = await fetch("https://zernio.com/api/v1/profiles", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    results.profilesStatus = res.status;
    results.profiles = data;
  } catch (err) {
    results.profilesError = String(err);
  }

  // 2. List accounts
  try {
    const res = await fetch("https://zernio.com/api/v1/accounts", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    results.accountsStatus = res.status;
    results.accounts = data;
  } catch (err) {
    results.accountsError = String(err);
  }

  // 3. Try connect with current profileId
  if (profileId) {
    try {
      const connectUrl = `https://zernio.com/api/v1/connect/twitter?profileId=${profileId}&redirect_url=https://x-com.fun/api/auth/x/callback`;
      const res = await fetch(connectUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      results.connectStatus = res.status;
      results.connectResponse = data;
    } catch (err) {
      results.connectError = String(err);
    }

    // 4. Try without prof_ prefix if it starts with prof_
    if (profileId.startsWith("prof_")) {
      const rawId = profileId.replace("prof_", "");
      try {
        const connectUrl = `https://zernio.com/api/v1/connect/twitter?profileId=${rawId}&redirect_url=https://x-com.fun/api/auth/x/callback`;
        const res = await fetch(connectUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await res.json();
        results.connectWithoutPrefixStatus = res.status;
        results.connectWithoutPrefixResponse = data;
        results.rawIdUsed = rawId;
      } catch (err) {
        results.connectWithoutPrefixError = String(err);
      }
    }
  }

  return NextResponse.json(results, { status: 200 });
}
