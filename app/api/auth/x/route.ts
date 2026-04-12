import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { isZernioMode } from "@/lib/x/oauth-contract";
import { getTwitterConnectUrl } from "@/lib/zernio/client";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthorizationUrl,
} from "@/lib/x/oauth-client";

export async function GET() {
  /* ── Zernio mode (preferred) ── */
  if (isZernioMode()) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://x-com.fun";
    const callbackUrl = `${baseUrl}/api/auth/x/callback`;

    let authUrl: string;
    try {
      authUrl = await getTwitterConnectUrl(callbackUrl);
    } catch (error) {
      console.error("Zernio connect error:", error);
      return Response.json(
        {
          error: "Failed to connect via Zernio",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }

    return Response.json({ authUrl });
  }

  /* ── Legacy direct X OAuth PKCE ── */
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomUUID();

  try {
    const cookieStore = await cookies();

    cookieStore.set("x_oauth_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    cookieStore.set("x_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
  } catch (error) {
    console.error("OAuth initialization error:", error);
    return Response.json(
      {
        error: "Failed to initialize OAuth flow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  const authUrl = buildAuthorizationUrl(codeChallenge, state);

  // If client requests JSON (mobile flow), return URL for client-side navigation
  // which triggers Universal Links / App Links to open the X app
  // Otherwise, fallback to server redirect (desktop)
  return Response.json({ authUrl });
}
