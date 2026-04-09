import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isZernioMode } from "@/lib/x/oauth-contract";
import { findTwitterAccount } from "@/lib/zernio/client";
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
  const error = searchParams.get("error");

  if (error) {
    console.error("OAuth error:", error);
    redirect("/?auth_error=denied");
  }

  const cookieStore = await cookies();

  /* ── Zernio mode ── */
  if (isZernioMode()) {
    // Zernio redirects back after connecting the account.
    // The account is now available via the Zernio API.
    // We need to figure out which account was just connected.
    // Zernio may pass accountId or username in the callback params.
    const accountId = searchParams.get("accountId");
    const username = searchParams.get("username");

    if (!accountId && !username) {
      // Zernio connected successfully but we need to list accounts
      // to find the newly connected one. For now, redirect to connect page
      // where the user can pick their account.
      redirect("/connect-x?connected=true");
      return;
    }

    // Look up the connected account
    let xHandle = username ? `@${username.replace(/^@/, "")}` : null;
    let xUserId = accountId ?? "";
    let avatarUrl: string | undefined;
    let resolvedDisplayName: string | undefined;

    // Try to get full account info from Zernio (includes avatar, display name)
    if (username || accountId) {
      try {
        const { listAccounts } = await import("@/lib/zernio/client");
        const accounts = await listAccounts();
        const cleanUsername = username?.replace(/^@/, "").toLowerCase();
        const match = accounts.find((a) =>
          a.platform === "twitter" &&
          (cleanUsername ? a.username?.toLowerCase() === cleanUsername : a.id === accountId),
        );
        if (match) {
          xUserId = xUserId || match.id;
          xHandle = xHandle || (match.username ? `@${match.username}` : null);
          resolvedDisplayName = match.displayName || undefined;
          // Zernio may return avatar under various field names
          avatarUrl = match.avatarUrl ?? match.profileImageUrl ?? match.avatar ?? undefined;
        }
      } catch (err) {
        console.error("[auth/callback] Failed to fetch Zernio account details:", err);
      }
    }

    if (username && !accountId && !xUserId) {
      const account = await findTwitterAccount(username);
      if (account) {
        xUserId = account.id;
        xHandle = `@${account.username}`;
        avatarUrl = avatarUrl ?? account.avatarUrl ?? account.profileImageUrl ?? account.avatar;
      }
    }

    if (!xHandle) {
      xHandle = `@user_${xUserId.slice(0, 8)}`;
    }

    // Fall back to unavatar.io for Twitter profile pictures
    const cleanHandle = xHandle.replace(/^@/, "");
    if (!avatarUrl && cleanHandle) {
      avatarUrl = `https://unavatar.io/twitter/${cleanHandle}`;
    }

    // Create or find user in our store
    const snapshot = await readXcomStore();
    let user = snapshot.users.find(
      (u) => u.xUserId === xUserId || u.xHandle === xHandle,
    );

    if (!user) {
      const displayName = resolvedDisplayName ?? username ?? xUserId.slice(0, 12);
      const newUser: XcomStoreUser = {
        id: randomUUID(),
        xUserId,
        xHandle: xHandle!,
        displayName,
        avatar: avatarUrl ?? (displayName
          .split(" ")
          .slice(0, 2)
          .map((part) => part.slice(0, 1).toUpperCase())
          .join("") || "X"),
      };

      await upsertUserInDb(newUser);
      if (!process.env.DATABASE_URL) {
        await updateXcomStore((snap) => ({
          ...snap,
          users: [...snap.users, newUser],
        }));
      }

      user = newUser;
    } else if (avatarUrl && (!user.avatar || !user.avatar.startsWith("http"))) {
      // User exists but doesn't have a profile image yet — update it
      try {
        if (process.env.DATABASE_URL) {
          const { getDb } = await import("@/lib/database/client");
          const { users: usersTable } = await import("@/drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const db = getDb();
          await db.update(usersTable).set({
            avatarUrl,
            displayName: resolvedDisplayName ?? user.displayName,
          }).where(eq(usersTable.id, user.id));
          user = { ...user, avatar: avatarUrl, displayName: resolvedDisplayName ?? user.displayName };
        }
      } catch (err) {
        console.error("[auth/callback] Failed to update user avatar:", err);
      }
    }

    // Store the Zernio accountId so we can post on behalf of this user
    await saveUserTokens({
      userId: user.id,
      accessToken: xUserId, // Store Zernio accountId as "token"
      refreshToken: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    });

    cookieStore.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/");
    return;
  }

  /* ── Legacy direct X OAuth PKCE ── */
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    redirect("/?auth_error=missing_params");
    return;
  }

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

    cookieStore.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.delete("x_oauth_code_verifier");
    cookieStore.delete("x_oauth_state");
  } catch (err) {
    console.error("OAuth callback error (post-auth):", err);
    const msg = encodeURIComponent(err instanceof Error ? err.message : String(err));
    redirect(`/?auth_error=setup_failed&detail=${msg}`);
  }

  redirect("/");
}
