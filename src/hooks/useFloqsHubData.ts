import { useMemo } from "react";
// Adapt to your actual hooks. These names are common in your repo; adjust if needed.
import { useMyFloqs } from "@/hooks/useMyFloqs";
import { useNearbyFloqs } from "@/hooks/useNearbyFloqs";
import { useGeo } from "@/hooks/useGeo";

export type HubItem = {
  id: string;
  name?: string;
  title?: string;
  status: "live" | "upcoming" | "ended";
  type?: "momentary" | "tribe" | "public";
  privacy?: "private" | "public" | "hidden";
  visibility?: "private" | "public" | "hidden";
  starts_at?: string;
  ends_at?: string;
  participants?: number;
  participant_count?: number;
  friends_in?: number;
  vibe?: string;
  primary_vibe?: string;
  eta_minutes?: number | null;
  door_policy?: "open" | "cover" | "line" | "guest" | null;
  recsys_score?: number;
  energy_now?: number;
  energy_peak?: number;
  distance_meters?: number;
  created_at?: string;
  creator_id?: string;
};

export function useFloqsHubData() {
  const { coords } = useGeo();
  const lat = coords?.lat ?? 0;
  const lng = coords?.lng ?? 0;

  // Use your existing hooks with proper error handling
  const nearbyQuery = useNearbyFloqs(lat, lng, { km: 5 });
  const myFloqsQuery = useMyFloqs();

  const nearby = (nearbyQuery.nearby || []) as HubItem[];
  const mine = (myFloqsQuery.data || []) as HubItem[];

  const momentaryLive = useMemo(
    () => nearby.filter((f) => {
      // Determine if it's momentary based on various possible indicators
      const isMomentary = f.type === "momentary" || 
                         (f.ends_at && new Date(f.ends_at) > new Date()) ||
                         f.title?.includes("momentary") ||
                         false;
      const isLive = f.status === "live" || 
                    (f.starts_at && f.ends_at && 
                     new Date() >= new Date(f.starts_at) && 
                     new Date() <= new Date(f.ends_at));
      // Ensure required fields for MomentaryCardItem
      return isMomentary && isLive && f.starts_at && f.ends_at;
    }).map(f => ({
      ...f,
      starts_at: f.starts_at!,
      ends_at: f.ends_at!,
    })),
    [nearby]
  );

  const tribes = useMemo(
    () => mine.filter((f) => 
      f.type === "tribe" || 
      f.privacy === "private" || 
      f.visibility === "private"
    ),
    [mine]
  );

  const publicFloqs = useMemo(
    () => nearby.filter((f) => 
      (f.privacy === "public" || f.visibility === "public" || !f.privacy) && 
      f.type !== "momentary"
    ),
    [nearby]
  );

  const discover = useMemo(() => {
    // start simple: top-scoring / nearby; you likely have a recsys view to replace this
    return [...nearby]
      .sort((a, b) => (b.recsys_score ?? 0) - (a.recsys_score ?? 0))
      .slice(0, 12);
  }, [nearby]);

  const constellationNodes = useMemo(
    () =>
      nearby.slice(0, 60).map((f) => ({
        id: f.id,
        name: f.name || f.title || "Untitled",
        status: (f.status === "live" ? "live" : "upcoming") as "live" | "upcoming",
        participants: f.participants ?? f.participant_count ?? 0,
        friends_in: f.friends_in ?? 0,
        score: clamp01(
          0.6 * (f.recsys_score ?? 0.5) +
          0.3 * (f.status === "live" ? 1 : timeDecay(f.starts_at)) +
          0.1 * 0.5 // vibe match stub; swap with your engine when ready
        ),
      })),
    [nearby]
  );

  return { 
    momentaryLive: momentaryLive.slice(0, 20), 
    tribes: tribes.slice(0, 12), 
    publicFloqs: publicFloqs.slice(0, 20), 
    discover: discover.slice(0, 12), 
    constellationNodes 
  };
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function timeDecay(starts_at?: string) {
  if (!starts_at) return 0.2;
  const m = (new Date(starts_at).getTime() - Date.now()) / 60000;
  return Math.exp(-Math.max(0, m) / 60); // 1h decay
}