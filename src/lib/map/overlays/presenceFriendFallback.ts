// Keep this export aligned with the actual fallback used in presenceClusterOverlay
export const FRIEND_FALLBACK_FILTER = [
  "all",
  ["!has", "point_count"],
  ["match", ["get", "kind"], ["friend", "bestie"], true, false],
  ["!", ["has", "iconId"]],
] as const;