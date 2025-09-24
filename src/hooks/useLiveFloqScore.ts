import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { Database } from '@/integrations/supabase/types';

interface FloqActivityData {
  id: string;
  activity_score: number;
  participant_count: number;
  last_activity_at: string;
}

export function useLiveFloqScore(floqId: string | undefined) {
  const query = useQuery<FloqActivityData | null>({
    queryKey: ["floq-activity", floqId],
    enabled: !!floqId,
    queryFn: async () => {
      if (!floqId) return null;
      
      const { data, error } = await supabase
        .from("floqs")
        .select(`
          id,
          activity_score,
          last_activity_at,
          floq_participants!inner(count)
        `)
        .eq("id", floqId as any)
        .single();

      if (error) {
        console.error("Floq activity score error:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No floq data found");
      }

      return {
        id: (data as any).id,
        activity_score: (data as any).activity_score || 0,
        participant_count: (data as any).floq_participants?.length || 0,
        last_activity_at: (data as any).last_activity_at || ''
      } satisfies FloqActivityData;
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60, // 1 minute
  });

  // Set up real-time subscription for activity score updates
  useEffect(() => {
    if (!floqId) return;

    const channel = supabase
      .channel(`floq-activity-${floqId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'floqs',
          filter: `id=eq.${floqId}`
        },
        (payload) => {
          console.log('Floq activity update:', payload);
                  // Optimistically update the query data
          query.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_participants',
          filter: `floq_id=eq.${floqId}`
        },
        (payload) => {
          console.log('Floq participants update:', payload);
          // Trigger smooth refetch with notification
          setTimeout(() => query.refetch(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, query]);

  return query;
}