import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHQVibes(floqId?: string) {
  return useQuery({
    queryKey: ["hq-vibes", floqId],
    enabled: !!floqId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("hq-vibes", { 
        body: { floq_id: floqId }
      });
      if (error) throw error;
      return data as { 
        per_member: any[]; 
        consensus: { vibe: string | null; match_pct: number } 
      };
    }
  });
}