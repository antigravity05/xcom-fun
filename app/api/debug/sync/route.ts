export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint for X sync troubleshooting.
 * GET /api/debug/sync?userId=<x_account_user_id>
 *
 * Returns a JSON report showing:
 * - Which env vars are set
 * - Which publishing path is active (Zernio vs Direct X)
 * - What tokens are stored for the user
 * - Whether Zernio API is reachable
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const report: Record<string, unknown> = {};

  // 1. Env vars check
  report.envVars = {
    ZERNIO_API_KEY: process.env.ZERNIO_API_KEY
      ? `set (${process.env.ZERNIO_API_KEY.slice(0, 8)}...)`
      : "NOT SET",
    ZERNIO_PROFILE_ID: process.env.ZERNIO_PROFILE_ID
      ? `set (${process.env.ZERNIO_PROFILE_ID})`
      : "NOT SET",
    X_CLIENT_ID: process.env.X_CLIENT_ID ? "set" : "NOT SET",
    X_CLIENT_SECRET: process.env.X_CLIENT_SECRET ? "set" : "NOT SET",
    X_CALLBACK_URL: process.env.X_CALLBACK_URL ? "set" : "NOT SET",
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "NOT SET",
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "NOT SET (will default to https://www.x-com.fun)",
  };

  // 2. Active mode
  const isZernio = Boolean(process.env.ZERNIO_API_KEY);
  report.activeMode = isZernio ? "ZERNIO" : "DIRECT_X_API";

  // 3. Token check
  if (userId) {
    try {
      const { getUserTokens } = await import("@/lib/x/token-store");
      const tokens = await getUserTokens(userId);

      if (!tokens) {
        report.tokens = { status: "NO TOKENS FOUND", userId };
      } else {
        const accessToken = tokens.accessToken;
        const looksLikeZernioAccountId =
          /^[a-f0-9]{24}$/.test(accessToken) ||
          accessToken.startsWith("acc_");
        const looksLikeEncrypted =
          accessToken.includes(":") && accessToken.length > 50;

        report.tokens = {
          status: "FOUND",
          userId,
          accessTokenPreview: `${accessToken.slice(0, 12)}...${accessToken.slice(-6)}`,
          accessTokenLength: accessToken.length,
          looksLikeZernioAccountId,
          looksLikeEncryptedXToken: looksLikeEncrypted,
          hasRefreshToken: Boolean(tokens.refreshToken),
          expiresAt: tokens.expiresAt,
          isExpired: new Date(tokens.expiresAt) < new Date(),
        };

        if (isZernio && !looksLikeZernioAccountId) {
          report.tokens.WARNING =
            "Zernio mode is active but the stored token does NOT look like a Zernio accountId. " +
            "The user likely connected BEFORE Zernio was configured. " +
            "They need to reconnect their X account.";
        }
      }
    } catch (err) {
      report.tokens = {
        status: "ERROR",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    report.tokens = {
      status: "SKIPPED",
      hint: "Add ?userId=<x_account_user_id> to check stored tokens. Find your userId in browser devtools or DB.",
    };
  }

  // 4. Zernio API connectivity check
  if (isZernio) {
    try {
      const res = await fetch("https://api.zernio.com/v1/accounts", {
        headers: {
          Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const body = await res.text();

      report.zernioApiCheck = {
        status: res.status,
        ok: res.ok,
        accountsPreview: res.ok
          ? (() => {
              try {
                const parsed = JSON.parse(body);
                const accounts = Array.isArray(parsed) ? parsed : parsed.accounts || parsed.data || [];
                return accounts.map((a: Record<string, unknown>) => ({
                  id: a.id || a._id,
                  platform: a.platform,
                  username: a.username,
                }));
              } catch {
                return body.slice(0, 200);
              }
            })()
          : body.slice(0, 200),
      };
    } catch (err) {
      report.zernioApiCheck = {
        status: "NETWORK_ERROR",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 5. Zernio connect flow check
  if (isZernio) {
    report.connectFlowReady = Boolean(process.env.ZERNIO_PROFILE_ID);
    if (!process.env.ZERNIO_PROFILE_ID) {
      report.connectFlowWarning =
        "ZERNIO_PROFILE_ID is NOT set. The OAuth connect flow (reconnecting X account) will FAIL. " +
        "Users cannot link their Twitter account via Zernio without this. " +
        "Set it to: 69d81a8abc780f134d7b352a";
    }
  }

  // 6. List all stored X accounts (to find userIds)
  try {
    const { getDb } = await import("@/lib/database/client");
    const { xAccounts } = await import("@/drizzle/schema");
    const db = getDb();
    const allAccounts = await db
      .select({
        userId: xAccounts.userId,
        updatedAt: xAccounts.updatedAt,
        expiresAt: xAccounts.expiresAt,
      })
      .from(xAccounts)
      .limit(20);

    report.storedAccounts = allAccounts.map((a) => ({
      userId: a.userId,
      updatedAt: a.updatedAt?.toISOString(),
      expiresAt: a.expiresAt?.toISOString(),
    }));
  } catch (err) {
    report.storedAccounts = {
      status: "ERROR",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
