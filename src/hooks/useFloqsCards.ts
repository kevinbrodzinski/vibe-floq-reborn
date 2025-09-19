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
  next_plan_id: string | null;         // for RSVP linking
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
  avatar_url: string | null;           // floq brand avatar or creator avatar
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
  nextPlanId?: string;                 // for RSVP linking
  nextLabel?: string;
  nextWhen?: string;
  ttlSeconds?: number;
  matchPct?: number;
  following?: boolean;
  streakWeeks?: number;
  rallyNow?: boolean;
  forming?: boolean;
  lastActiveAgo?: string;
  avatarUrl?: string;                  // floq brand avatar or creator avatar
};

export function useFloqsCards() {
  return useQuery({
    queryKey: ["floqs-cards"],
    queryFn: async () => {
      // Use the new floqs_card_view that provides all the columns we need
      const { data, error } = await supabase
        .from("floqs_card_view")
        .select("*")
        .limit(120);
      
      if (error) throw error;
      
      // Transform the view data to match our expected structure
      const rows = (data ?? []) as CardRow[];
      const list: LivingFloq[] = rows.map(transformRowToLivingFloq);

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
    nextPlanId: r.next_plan_id || undefined,
    nextLabel: r.next_label || undefined,
    nextWhen: r.next_when || undefined,
    ttlSeconds: r.ttl_seconds ?? undefined,
    matchPct: r.match_pct ?? undefined,
    following: !!r.following,
    streakWeeks: r.streak_weeks ?? undefined,
    rallyNow: !!r.rally_now,
    forming: !!r.forming,
    lastActiveAgo: r.last_active_ago || undefined,
    avatarUrl: r.avatar_url || undefined,
  };
}