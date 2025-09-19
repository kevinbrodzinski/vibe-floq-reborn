import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SmartFilter, SmartItem } from "@/types/stream";

export function useSmartStream(floqId: string, filter: SmartFilter, lastSeenTs: string | null, mode: "floq" | "field" = "floq") {
  return useQuery({
    queryKey: ["smart-stream", floqId, filter, lastSeenTs, mode],
    enabled: !!floqId,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.functions.invoke<{ items: SmartItem[]; unread_count: number }>(
        "smart-stream-rank",
        { 
          body: { floq_id: floqId, filter, last_seen_ts: lastSeenTs, mode }
        }
      );
      
      if (error) {
        console.error("Stream fetch error:", error);
        throw error;
      }
      
      return data!;
    },
  });
}

export function useMarkStreamSeen(floqId: string, setLastSeenTs: (ts: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ signal }: { signal?: AbortSignal } = {}) => {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; last_seen_ts: string }>(
        "smart-stream-read",
        { 
          body: { floq_id: floqId }
        }
      );
      
      if (error) {
        throw error;
      }
      
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
    return () => { ch.unsubscribe(); };
  }, [floqId, qc]);
}