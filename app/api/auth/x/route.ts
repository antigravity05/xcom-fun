import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
    try {
      const authUrl = await getTwitterConnectUrl(callbackUrl);
      redirect(authUrl);
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
  redirect(authUrl);
}
