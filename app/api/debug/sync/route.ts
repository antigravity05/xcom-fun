export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint for X sync troubleshooting.
 * GET /api/debug/sync
 */
export async function GET() {
  const report: Record<string, unknown> = {};

  // 1. Env vars check
  report.envVars = {
    ZERNIO_API_KEY: process.env.ZERNIO_API_KEY ? "SET" : "NOT SET",
    ZERNIO_PROFILE_ID: process.env.ZERNIO_PROFILE_ID ? "SET" : "NOT SET",
    X_CLIENT_ID: process.env.X_CLIENT_ID ? "SET" : "NOT SET",
    X_CLIENT_SECRET: process.env.X_CLIENT_SECRET ? "SET" : "NOT SET",
    X_CALLBACK_URL: process.env.X_CALLBACK_URL ?? "NOT SET",
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? "NOT SET",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "NOT SET",
  };

  // 2. Active mode
  const isZernio = Boolean(process.env.ZERNIO_API_KEY);
  report.activeMode = isZernio ? "ZERNIO" : "DIRECT_X_API";
  report.connectFlowReady = isZernio ? Boolean(process.env.ZERNIO_PROFILE_ID) : "N/A";

  // 3. List stored X accounts + token analysis
  try {
    const { getDb } = await import("@/lib/database/client");
    const db = getDb();

    const rows = await db.query.xAccounts.findMany({ limit: 20 });

    report.storedAccounts = rows.map((row: Record<string, unknown>) => {
      const token = String(row.accessTokenCiphertext ?? "");
      const looksLikeZernioId = /^[a-f0-9]{24}$/.test(token) || token.startsWith("acc_");
      const looksLikeEncrypted = token.includes(":") && token.length > 50;

      return {
        userId: row.userId,
        tokenPreview: `${token.slice(0, 10)}...${token.slice(-6)}`,
        tokenLength: token.length,
        looksLikeZernioId,
        looksLikeEncrypted,
        tokenType: looksLikeZernioId ? "ZERNIO_ACCOUNT_ID" : looksLikeEncrypted ? "ENCRYPTED_X_TOKEN" : "UNKNOWN",
        warning: isZernio && !looksLikeZernioId
          ? "MISMATCH: Zernio mode active but token is NOT a Zernio accountId. User must reconnect X."
          : undefined,
        hasRefreshToken: Boolean(row.refreshTokenCiphertext),
        expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : String(row.expiresAt ?? ""),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? ""),
      };
    });
  } catch (err) {
    report.storedAccounts = { error: err instanceof Error ? err.message : String(err) };
  }

  // 4. Zernio API connectivity
  if (isZernio) {
    try {
      const res = await fetch("https://api.zernio.com/v1/accounts", {
        headers: { Authorization: `Bearer ${process.env.ZERNIO_API_KEY}` },
      });
      const body = await res.text();
      let accounts: unknown = body.slice(0, 300);
      if (res.ok) {
        try {
          const parsed = JSON.parse(body);
          const list = Array.isArray(parsed) ? parsed : parsed.accounts ?? parsed.data ?? [];
          accounts = list.map((a: Record<string, unknown>) => ({
            id: a.id ?? a._id,
            platform: a.platform,
            username: a.username,
          }));
        } catch { /* keep raw */ }
      }
      report.zernioApi = { status: res.status, ok: res.ok, accounts };
    } catch (err) {
      report.zernioApi = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 5. Image URL that would be generated
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.x-com.fun";
  report.imageUrlExample = `${baseUrl}/api/media/<postId>/0`;

  return new Response(JSON.stringify(report, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
