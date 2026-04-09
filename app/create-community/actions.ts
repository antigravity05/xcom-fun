"use server";

import { createCommunityAction as _createCommunityAction } from "@/app/xcom-actions";

/**
 * Re-export only the single action needed by the CreateCommunityForm.
 *
 * Why a separate file?
 * ---
 * Next.js / Turbopack generates server-action references for every export in
 * a "use server" module that is imported by a client component.  The main
 * `xcom-actions.ts` file re-exports ~15 server actions, many of which call
 * `redirect()` (which throws NEXT_REDIRECT).  Processing all of them during
 * client-bundle reference creation can destabilise the RSC payload on
 * Turbopack versions shipped with Next 16.
 *
 * By splitting the import surface to a single export the bundler only needs
 * to create one reference, which avoids the crash.
 */
export const createCommunityAction = _createCommunityAction;
