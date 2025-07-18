import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FloqPlanRow {
  id: string;
  floq_id: string;
  title: string;
  planned_at: string;
  end_at?: string;
  description?: string;
  max_participants?: number;
  created_at: string;
}

export function useFloqPlans(floqId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["floq-plans", floqId],
    enabled: !!floqId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floq_plans")
        .select("*")
        .eq("floq_id", floqId)
        .order("planned_at", { ascending: true });

      if (error) throw error;
      return data as FloqPlanRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // realtime → invalidate
  useEffect(() => {
    if (!floqId) return;

    const channel = supabase
      .channel(`floq_plans:${floqId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "floq_plans",
          filter: `floq_id=eq.${floqId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["floq-plans", floqId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, qc]);

  return query;
}