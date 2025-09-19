import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CardRow = {
  id: string;
  name: string | null;
  title: string | null;
  description: string | null;
  kind: "friend"|"club"|"business"|"momentary";
  primary_vibe: string | null;
  member_count: number | null;
  active_now: number | null;
  converging_nearby: number | null;
  distance_label: string | null;
  energy: number | null;               // 0..1
  next_label: string | null;
  next_when: string | null;            // "Tonight", "Tomorrow 6am"
  ttl_seconds: number | null;          // momentary only
  match_pct: number | null;            // club discovery
  following: boolean | null;           // business/club
  streak_weeks: number | null;         // friend floq
  last_active_ago: string | null;      // "2 hours ago"
  rally_now: boolean | null;
  forming: boolean | null;
  status_bucket: "now"|"today"|"upcoming"|"dormant";
};

export type LivingFloq = {
  id: string;
  name: string;
  description?: string;
  kind: "friend"|"club"|"business"|"momentary";
  vibe?: string;
  totalMembers?: number;
  activeMembers?: number;
  convergenceNearby?: number;
  distanceLabel?: string;
  energy?: number;
  nextLabel?: string;
  nextWhen?: string;
  ttlSeconds?: number;
  matchPct?: number;
  following?: boolean;
  streakWeeks?: number;
  rallyNow?: boolean;
  forming?: boolean;
  lastActiveAgo?: string;
};

export function useFloqsCards() {
  return useQuery({
    queryKey: ["floqs-cards"],
    queryFn: async () => {
      // Query floqs table directly for now
      const { data: floqsData, error: floqsError } = await supabase
        .from("floqs")
        .select(`
          id, name, title, description, primary_vibe, 
          visibility, created_at
        `)
        .eq("visibility", "public")
        .limit(50);
      
      if (floqsError) throw floqsError;
      
      // Transform basic data with minimal logic
      const rows = (floqsData ?? []).map(f => ({
        id: f.id,
        name: f.name,
        title: f.title,
        description: f.description,
        primary_vibe: f.primary_vibe,
        kind: "club" as const, // Default fallback
        member_count: Math.floor(Math.random() * 30) + 5, // Temporary mock for demo
        active_now: Math.floor(Math.random() * 8) + 1,
        converging_nearby: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
        distance_label: Math.random() > 0.6 ? `${(Math.random() * 2 + 0.2).toFixed(1)} km` : null,
        energy: Math.random() * 0.5 + 0.3,
        next_label: Math.random() > 0.5 ? "Weekly meetup" : null,
        next_when: Math.random() > 0.5 ? "Thursday 7pm" : null,
        ttl_seconds: null,
        match_pct: Math.random() * 0.4 + 0.6,
        following: Math.random() > 0.7,
        streak_weeks: null,
        last_active_ago: Math.random() > 0.8 ? "2 hours ago" : null,
        rally_now: Math.random() > 0.9,
        forming: Math.random() > 0.85,
        status_bucket: (() => {
          const rand = Math.random();
          if (rand > 0.85) return "now" as const;
          if (rand > 0.65) return "today" as const;
          if (rand > 0.35) return "upcoming" as const;
          return "dormant" as const;
        })(),
      })) as CardRow[];
      
      const list = rows.map(r => transformRowToLivingFloq(r));

      const by = (bucket: CardRow["status_bucket"]) =>
        rows
          .filter(r => r.status_bucket === bucket)
          .map(r => list.find(x => x.id === r.id)!)
          .filter(Boolean);

      return {
        now: by("now"),
        today: by("today"),
        upcoming: by("upcoming"),
        dormant: by("dormant"),
      };
    }
  });
}

function transformRowToLivingFloq(r: CardRow): LivingFloq {
  return {
    id: r.id,
    name: r.name || r.title || "Untitled Floq",
    description: r.description || undefined,
    kind: r.kind,
    vibe: r.primary_vibe || undefined,
    totalMembers: r.member_count ?? 0,
    activeMembers: r.active_now ?? 0,
    convergenceNearby: r.converging_nearby ?? 0,
    distanceLabel: r.distance_label || undefined,
    energy: r.energy ?? 0.35,
    nextLabel: r.next_label || undefined,
    nextWhen: r.next_when || undefined,
    ttlSeconds: r.ttl_seconds ?? undefined,
    matchPct: r.match_pct ?? undefined,
    following: !!r.following,
    streakWeeks: r.streak_weeks ?? undefined,
    rallyNow: !!r.rally_now,
    forming: !!r.forming,
    lastActiveAgo: r.last_active_ago || undefined,
  };
}