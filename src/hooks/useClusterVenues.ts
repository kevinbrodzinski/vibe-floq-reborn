import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClusterVenue {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  vibe_score: number;
  live_count: number;
  /** popularity snapshot returned by the RPC – used for cursor-paging */
  popularity: number;
}

/** Fetches venues that fall inside the current map bounds. */
export function useClusterVenues(
  bounds: [number, number, number, number] | null,
) {
  return useQuery<ClusterVenue[]>({
    queryKey: ["cluster-venues", bounds ? JSON.stringify(bounds) : null],
    placeholderData: prev => prev ?? [],
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!bounds) return [];

      const [w, s, e, n] = bounds;

      const { data, error } = await supabase.rpc("get_cluster_venues", {
        min_lng: w,
        min_lat: s,
        max_lng: e,
        max_lat: n,
        cursor_popularity: 0,
        limit_rows: 10,
      });

      if (signal?.aborted)
        throw new DOMException("Aborted", "AbortError");

      if (error) {
        console.error("[useClusterVenues] RPC error:", error);
        throw error;
      }

      return (data ?? []).map(v => ({
        ...v,
        lat: +v.lat,
        lng: +v.lng,
        popularity: (v as any).popularity ?? (v as any).check_ins ?? 0,
      }));
    },
  });
}