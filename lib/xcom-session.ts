import "server-only";

import { cookies } from "next/headers";

const viewerCookieName = "xcom_demo_user_id";

export const getViewerUserId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(viewerCookieName)?.value ?? null;
};

export const setViewerUserId = async (userId: string) => {
  const cookieStore = await cookies();
  cookieStore.set(viewerCookieName, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};

export const clearViewerUserId = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(viewerCookieName);
};
