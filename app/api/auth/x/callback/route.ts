import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  exchangeCodeForTokens,
  getXUserProfile,
} from "@/lib/x/oauth-client";
import { encryptToken } from "@/lib/x/token-encryption";
import { saveUserTokens } from "@/lib/x/token-store";
import { readXcomStore, updateXcomStore } from "@/lib/xcom-persistence";
import type { XcomStoreUser } from "@/lib/xcom-store";

const upsertUserInDb = async (newUser: XcomStoreUser) => {
  if (!process.env.DATABASE_URL) return;
  try {
    const { getDb } = await import("@/lib/database/client");
    const { users } = await import("@/drizzle/schema");
    const db = getDb();
    await db
      .insert(users)
      .values({
        id: newUser.id,
        xUserId: newUser.xUserId,
        xHandle: newUser.xHandle,
        displayName: newUser.displayName,
        avatarUrl: newUser.avatar,
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error("Failed to upsert user in DB:", err);
  }
};

const SESSION_COOKIE_NAME = "xcom_demo_user_id";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("OAuth error from X:", error);
    redirect("/?auth_error=denied");
    return;
  }

  if (!code || !state) {
    redirect("/?auth_error=missing_params");
    return;
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_oauth_code_verifier")?.value;

  if (!storedState || !codeVerifier) {
    redirect("/?auth_error=expired_session");
    return;
  }

  if (state !== storedState) {
    redirect("/?auth_error=state_mismatch");
    return;
  }

  let tokenResponse;
  let userProfile;
  try {
    tokenResponse = await exchangeCodeForTokens(code, codeVerifier);
  } catch (err) {
    console.error("OAuth callback error (token exchange):", err);
    const msg = encodeURIComponent(err instanceof Error ? err.message : String(err));
    redirect(`/?auth_error=exchange_failed&detail=${msg}`);
  }

  try {
    userProfile = await getXUserProfile(tokenResponse.access_token);
  } catch (err) {
    console.error("OAuth callback error (user profile):", err);
    const msg = encodeURIComponent(err instanceof Error ? err.message : String(err));
    redirect(`/?auth_error=profile_failed&detail=${msg}`);
  }

  try {
    const snapshot = await readXcomStore();
    let user = snapshot.users.find(
      (u) => u.xUserId === userProfile.id || u.xHandle === `@${userProfile.username}`,
    );

    if (!user) {
      const newUser: XcomStoreUser = {
        id: randomUUID(),
        xUserId: userProfile.id,
        xHandle: `@${userProfile.username}`,
        displayName: userProfile.name,
        avatar: userProfile.name
          .split(" ")
          .slice(0, 2)
          .map((part) => part.slice(0, 1).toUpperCase())
          .join(""),
      };

      await upsertUserInDb(newUser);
      if (!process.env.DATABASE_URL) {
        await updateXcomStore((snap) => ({
          ...snap,
          users: [...snap.users, newUser],
        }));
      }

      user = newUser;
    }

    // Store encrypted tokens (DB or filesystem depending on env)
    const encryptedAccessToken = encryptToken(tokenResponse.access_token);
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? encryptToken(tokenResponse.refresh_token)
      : null;

    await saveUserTokens({
      userId: user.id,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: new Date(
        Date.now() + tokenResponse.expires_in * 1000,
      ).toISOString(),
    });

    // Set session cookie
    cookieStore.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Clear PKCE cookies
    cookieStore.delete("x_oauth_code_verifier");
    cookieStore.delete("x_oauth_state");
  } catch (err) {
    console.error("OAuth callback error (post-auth):", err);
    const msg = encodeURIComponent(err instanceof Error ? err.message : String(err));
    redirect(`/?auth_error=setup_failed&detail=${msg}`);
  }

  redirect("/");
}
