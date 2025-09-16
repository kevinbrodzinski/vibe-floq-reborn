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

export type ConstellationNode = {
  id: string; name: string;
  status: "live" | "upcoming";
  participants: number;
  friends_in?: number;
  score: number; // 0..1
};

export type ConstellationEdge = {
  a: string; b: string;                 // node ids
  w: number;                            // 0..1 weight (controls alpha/width)
  kind: "time" | "friend";
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

  // Helper functions
  const isLiveWindow = (s?: string, e?: string) =>
    !!(s && e && Date.now() >= +new Date(s) && Date.now() <= +new Date(e));

  const isMomentary = (f: any) =>
    f.type === "momentary" || !!(f.starts_at && f.ends_at); // keep simple & stable

  const momentaryLive = useMemo(
    () => nearby
      .filter((f) => isMomentary(f) && isLiveWindow(f.starts_at, f.ends_at))
      .slice(0, 20)
      .map((f) => ({ ...f, starts_at: f.starts_at!, ends_at: f.ends_at! })),
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

  const constellationNodes: ConstellationNode[] = useMemo(
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

  // Build edges: time-proximity (+ optional friend-overlap if arrays present).
  const constellationEdges: ConstellationEdge[] = useMemo(() => {
    const nodes = constellationNodes;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const items = nearby.filter(n => byId.has(n.id));
    const edges: ConstellationEdge[] = [];

    const N = Math.min(items.length, 60);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const A = items[i], B = items[j];

        // 1) Time proximity (within 45m)
        const dt = minutesBetween(A.starts_at, B.starts_at);
        if (Number.isFinite(dt) && dt <= 45) {
          const w = Math.exp(-dt / 30); // 1 at 0m → ~0.22 at 45m
          edges.push({ a: A.id, b: B.id, w: clamp01(w), kind: "time" });
        }

        // 2) Friend overlap (only if arrays provided)
        const aFriends: string[] | undefined = (A as any).friend_ids;
        const bFriends: string[] | undefined = (B as any).friend_ids;
        if (Array.isArray(aFriends) && Array.isArray(bFriends)) {
          let overlap = 0;
          const setB = new Set(bFriends);
          for (const f of aFriends) if (setB.has(f)) { overlap++; if (overlap >= 3) break; }
          if (overlap > 0) {
            const w = Math.min(1, overlap / 3); // cap at 3 for weight = 1
            edges.push({ a: A.id, b: B.id, w, kind: "friend" });
          }
        }
      }
    }

    // Keep the strongest ≤ 120 edges total
    return edges
      .sort((e1, e2) => e2.w - e1.w)
      .slice(0, 120);
  }, [constellationNodes, nearby]);

  return { 
    momentaryLive: momentaryLive.slice(0, 20), 
    tribes: tribes.slice(0, 12), 
    publicFloqs: publicFloqs.slice(0, 20), 
    discover: discover.slice(0, 12), 
    constellationNodes,
    constellationEdges
  };
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function timeDecay(starts_at?: string) {
  if (!starts_at) return 0.2;
  const m = (new Date(starts_at).getTime() - Date.now()) / 60000;
  return Math.exp(-Math.max(0, m) / 60); // 1h decay
}
function minutesBetween(a?: string, b?: string) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.abs((+new Date(a) - +new Date(b)) / 60000);
}