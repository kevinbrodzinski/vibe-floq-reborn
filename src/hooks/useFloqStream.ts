import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FloqMessage = {
  id: string;
  created_at: string;
  author_id: string;
  body: string;
  kind: "rally" | "moment" | "decision" | "system" | "text";
  profile_id: string;
  sender_id: string;
};

export function useFloqStream(floqId?: string) {
  return useQuery<FloqMessage[]>({
    queryKey: ["floq", floqId, "stream"],
    enabled: !!floqId,
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!floqId) return [];
      
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, created_at, profile_id, sender_id, body, message_type, metadata")
        .eq("thread_id", floqId)
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return (data ?? []).map(msg => ({
        id: msg.id,
        created_at: msg.created_at,
        author_id: msg.sender_id,
        body: msg.body || "",
        kind: msg.message_type || "text",
        profile_id: msg.profile_id,
        sender_id: msg.sender_id,
      })) as FloqMessage[];
    }
  });
}