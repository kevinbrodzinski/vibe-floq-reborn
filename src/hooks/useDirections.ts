import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Mode = "walking"|"driving";
export type RouteGeo = {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance_m: number;
  duration_s: number;
  steps: Array<{ distance_m:number; duration_s:number; instruction:string }>;
};

export function useDirections(
  origin: { lat:number; lng:number } | null,
  dest: { lat:number; lng:number } | null,
  mode: Mode = "walking",
  enabled = true,
) {
  const key = JSON.stringify({ origin, dest, mode });
  return useQuery({
    queryKey: ["hq-directions", key],
    enabled: Boolean(origin && dest) && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<RouteGeo>(
        "hq-directions",
        { body: { origin, dest, mode } }
      );
      if (error) throw error;
      return data!;
    },
  });
}