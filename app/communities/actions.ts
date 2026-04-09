"use server";

import { updateCommunityAction as _updateCommunityAction } from "@/app/xcom-actions";

/**
 * Thin re-export for client components.
 * Importing from the main xcom-actions.ts in a "use client" component forces
 * Turbopack to generate server-action references for every export in the
 * module. Splitting into focused files avoids RSC serialisation issues.
 */
export const updateCommunityAction = _updateCommunityAction;
