// Keep this export aligned with the actual fallback used in presenceClusterOverlay
export const FRIEND_FALLBACK_FILTER = [
  "all",
  ["!has", "point_count"],
  ["any", ["==", ["get", "kind"], "friend"], ["==", ["get", "kind"], "bestie"]],
  ["!has", "iconId"],
] as const;