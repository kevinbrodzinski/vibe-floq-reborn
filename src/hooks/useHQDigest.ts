import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHQDigest(floqId?: string, since?: string) {
  return useQuery({
    queryKey: ["hq-digest", floqId, since],
    enabled: !!floqId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("hq-digest", { 
        body: { floq_id: floqId, since }
      });
      if (error) throw error;
      return data as { 
        summary: any; 
        last_digest_at: string;
        receipt: any;
      };
    }
  });
}