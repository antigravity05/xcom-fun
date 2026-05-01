export const X_COMMUNITIES_DEADLINE = new Date("2026-05-06T00:00:00Z");

export function isXCommunitiesShutdownActive(): boolean {
  return Date.now() < X_COMMUNITIES_DEADLINE.getTime();
}
