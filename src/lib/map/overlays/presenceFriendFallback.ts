export const FRIEND_FALLBACK_FILTER = [
  "all",
  ["==", ["geometry-type"], "Point"],
  ["match", ["get", "kind"], ["friend", "bestie"], true, false],
] as const;