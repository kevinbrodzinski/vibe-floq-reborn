import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HalfCandidate = {
  id: string; 
  name: string; 
  lat: number; 
  lng: number;
  meters_from_centroid?: number; 
  avg_eta_min?: number;
  per_member?: Array<{ profile_id: string; meters: number; eta_min: number }>;
  score?: number;
  category?: "coffee" | "bar" | "food" | "park" | "other";
};

export type HalfResult = {
  centroid: { lat: number; lng: number };
  members?: Array<{ profile_id: string; lat: number; lng: number }>;
  candidates: HalfCandidate[];
  stats?: { sample: number; avg_pair_distance_m: number };
  policy?: { privacy: "banded"; min_members: number };
};

export function useHQMeetHalfway(
  floqId: string,
  opts: { categories?: string[]; max_km?: number; limit?: number; mode?: "walk" | "drive" } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["hq-meet-halfway", floqId, opts],
    enabled: Boolean(floqId) && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<HalfResult>(
        "hq-meet-halfway",
        { 
          body: { floq_id: floqId, ...opts }
        }
      );
      if (error) throw error;
      return data!;
    },
  });
}