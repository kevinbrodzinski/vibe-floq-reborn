import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MemberPoint = { profile_id: string; lat: number; lng: number; status?: "free"|"soon"|"busy"|"ghost" };
export type Proximity = { centroid: { lat:number; lng:number }; members: MemberPoint[]; convergence?: number };

export function useHQProximity(floqId: string, enabled=true) {
  return useQuery({
    queryKey: ["hq-proximity", floqId],
    enabled: Boolean(floqId) && enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Proximity>(
        "hq-proximity",
        { body: { floq_id: floqId } }
      );
      if (error) throw error;
      return data!;
    },
  });
}