import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LivingFloq } from "@/components/Floqs/cards/LivingFloqCard";

type Row = {
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
  energy: number | null;
  next_label: string | null;
  next_when: string | null;
  ttl_seconds: number | null;
  match_pct: number | null;
  following: boolean | null;
  streak_weeks: number | null;
  status_bucket: "now" | "today" | "upcoming" | "dormant";
};

export function useFloqsCards() {
  return useQuery({
    queryKey: ["floqs-cards"],
    queryFn: async () => {
      // Get user's floqs first
      const { data: userFloqs, error: userFloqsError } = await supabase
        .from("floq_participants")
        .select(`
          floq_id,
          role,
          floqs (
            id,
            name,
            title,
            description,
            primary_vibe,
            created_at
          )
        `)
        .eq("profile_id", (await supabase.auth.getUser()).data.user?.id);
        
      if (userFloqsError) throw userFloqsError;
      
      // Get discoverable floqs
      const { data: discoverFloqs, error: discoverError } = await supabase
        .from("floqs")
        .select("*")
        .eq("visibility", "public")
        .limit(50);
        
      if (discoverError) throw discoverError;

      // Mock status_bucket logic - in real app this would be computed in a view
      const getStatusBucket = (floq: any): "now" | "today" | "upcoming" | "dormant" => {
        const now = new Date();
        const created = new Date(floq.created_at);
        const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        
        // Mock logic for demonstration
        if (Math.random() > 0.8) return "now";
        if (daysDiff < 1) return "today";
        if (daysDiff < 7) return "upcoming";
        return "dormant";
      };

      // Transform user's floqs
      const userFloqsList: LivingFloq[] = (userFloqs ?? [])
        .filter(p => p.floqs)
        .map(participant => ({
          id: participant.floqs!.id,
          name: participant.floqs!.name || participant.floqs!.title || "Untitled Floq",
          description: participant.floqs!.description || undefined,
          kind: "friend" as const, // Default for user floqs
          vibe: participant.floqs!.primary_vibe || undefined,
          members: Math.floor(Math.random() * 20) + 3,
          activeNow: Math.floor(Math.random() * 5),
          convergenceNearby: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
          distanceLabel: Math.random() > 0.5 ? `${(Math.random() * 2 + 0.1).toFixed(1)} mi` : undefined,
          energy: Math.random() * 0.6 + 0.2,
          nextLabel: Math.random() > 0.6 ? "Coffee @ Blue Bottle" : undefined,
          nextWhen: Math.random() > 0.6 ? "Tonight 7:30" : undefined,
          following: participant.role === "member",
          streakWeeks: Math.random() > 0.6 ? Math.floor(Math.random() * 12) + 1 : undefined,
        }));

      // Transform discover floqs
      const discoverFloqsList: LivingFloq[] = (discoverFloqs ?? [])
        .filter(floq => !userFloqs?.some(p => p.floq_id === floq.id))
        .map(floq => ({
          id: floq.id,
          name: floq.name || floq.title || "Untitled Floq",
          description: floq.description || undefined,
          kind: "club" as const, // Default for discover floqs
          vibe: floq.primary_vibe || undefined,
          members: Math.floor(Math.random() * 50) + 10,
          activeNow: Math.floor(Math.random() * 8) + 2,
          convergenceNearby: Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0,
          distanceLabel: `${(Math.random() * 3 + 0.2).toFixed(1)} mi`,
          energy: Math.random() * 0.4 + 0.5,
          matchPct: Math.random() * 0.4 + 0.6,
          nextLabel: Math.random() > 0.5 ? "Weekly meetup" : undefined,
          nextWhen: Math.random() > 0.5 ? "Thursday 7pm" : undefined,
        }));

      const allFloqs = [...userFloqsList, ...discoverFloqsList];

      // Group by status buckets (mock logic)
      const by = (bucket: "now" | "today" | "upcoming" | "dormant") =>
        allFloqs.filter(() => {
          const rand = Math.random();
          switch (bucket) {
            case "now": return rand > 0.85;
            case "today": return rand > 0.65 && rand <= 0.85;
            case "upcoming": return rand > 0.35 && rand <= 0.65;
            case "dormant": return rand <= 0.35;
          }
        });

      return {
        now: by("now"),
        today: by("today"),
        upcoming: by("upcoming"),
        dormant: by("dormant"),
      };
    }
  });
}