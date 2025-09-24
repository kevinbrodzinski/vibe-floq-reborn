import * as React from "react";
// If these names differ, adjust imports here only.
import { useNearbyFloqs } from "@/hooks/useNearbyFloqs";
import { useMyFloqs } from "@/hooks/useMyFloqs";

export function PrewarmProbe({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  // Mounting these hooks warms the react-query cache. Component renders nothing.
  // Keep payloads small (nearby radius ~5km).
  if (useNearbyFloqs) useNearbyFloqs(lat ?? 0, lng ?? 0, { km: 5 });
  if (useMyFloqs) useMyFloqs();
  // If you have a recs hook, call it here too (e.g., useFloqRecs()).
  return null;
}
