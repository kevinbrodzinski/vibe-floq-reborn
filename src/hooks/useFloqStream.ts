import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FloqMessage = {
  id: string;
  created_at: string;
  sender_id: string;
  body: string;
  emoji?: string | null;
  floq_id: string;
  profile_id?: string | null;
};

export function useFloqStream(floqId?: string) {
  return useQuery<FloqMessage[]>({
    queryKey: ["floq", floqId, "stream"],
    enabled: !!floqId,
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!floqId) return [];
      
      const { data, error } = await supabase
        .from("floq_messages")
        .select("id, created_at, sender_id, body, emoji, floq_id, profile_id")
        .eq("floq_id", floqId)
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return (data ?? []) as FloqMessage[];
    }
  });
}