import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HalfCandidate = {
  id: string; 
  name: string; 
  lat: number; 
  lng: number;
  meters_from_centroid: number; 
  avg_eta_min: number;
  per_member: Array<{ profile_id: string; meters: number; eta_min: number }>;
  score: number;
};

export type HalfResult = {
  centroid: { lat: number; lng: number };
  members: Array<{ profile_id: string; lat: number; lng: number }>;
  candidates: HalfCandidate[];
  rationale?: string;
};

export function useHQMeetHalfway(
  floqId: string | undefined,
  categories: string[] = [],
  opts?: { enabled?: boolean }
) {
  return useQuery<HalfResult>({
    queryKey: ["hq-meet-halfway", floqId, categories.sort().join(",")],
    enabled: !!floqId && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("hq-meet-halfway", {
        body: { floq_id: floqId, categories, max_km: 3, limit: 6, mode: "walk" },
      });
      if (error) throw error;
      return data as HalfResult;
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}