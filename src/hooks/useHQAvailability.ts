import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HQAvailability = {
  availability: Array<{ 
    profile_id: string; 
    status: "free" | "soon" | "busy" | "ghost"; 
    until_at?: string;
  }>;
};

export function useHQAvailability(floqId?: string) {
  return useQuery<HQAvailability>({
    queryKey: ["hq-availability", floqId],
    enabled: !!floqId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("hq-availability", { 
        body: { floq_id: floqId }
      });
      if (error) throw error;
      return data as HQAvailability;
    }
  });
}