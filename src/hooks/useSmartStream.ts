import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SmartFilter = "all"|"unread"|"rally"|"photos"|"plans";
export type SmartItem = {
  id: string;
  kind: "rally"|"moment"|"plan"|"text";
  ts: string;
  priority: number;
  unread: boolean;
  title?: string;
  body?: string;
  media?: { thumb_url: string }[];
  rally?: { venue: string; at: string; counts:{going:number; maybe:number; noreply:number} };
  plan?:  { title: string; at: string; status:"locked"|"building"|"tentative" };
};

export function useSmartStream(floqId: string, filter: SmartFilter, lastSeenTs: string | null) {
  return useQuery({
    queryKey: ["smart-stream", floqId, filter, lastSeenTs],
    enabled: !!floqId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ items: SmartItem[]; unread_count:number }>(
        "smart-stream-rank", 
        { body: { floq_id: floqId, filter, last_seen_ts: lastSeenTs } }
      );
      if (error) throw error;
      return data!;
    },
  });
}

export function useMarkStreamSeen(floqId: string, setLastSeenTs: (ts: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ ok:boolean; last_seen_ts:string }>(
        "smart-stream-read", { body: { floq_id: floqId } }
      );
      if (error) throw error;
      return data!;
    },
    onSuccess: (res) => {
      setLastSeenTs(res.last_seen_ts); // immediately update queryKey
      qc.invalidateQueries({ queryKey: ["smart-stream", floqId] });
    }
  });
}

export function useStreamRealtime(floqId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!floqId) return;
    const ch = supabase.channel(`floq:${floqId}:stream`)
      .on("broadcast", { event: "stream" }, () => {
        qc.invalidateQueries({ queryKey: ["smart-stream", floqId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [floqId, qc]);
}