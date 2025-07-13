import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useLiveFloqScore(floqId: string) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!floqId) return;

    // Set up real-time subscription for floq activity score updates
    const channel = supabase
      .channel(`floq-score:${floqId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "floqs",
          filter: `id=eq.${floqId}`,
        },
        (payload) => {
          if (payload.new?.activity_score !== undefined) {
            setScore(payload.new.activity_score);
          }
        }
      )
      .subscribe();

    // Fetch initial score
    const fetchInitialScore = async () => {
      const { data } = await supabase
        .from("floqs")
        .select("activity_score")
        .eq("id", floqId)
        .single();
      
      if (data?.activity_score !== undefined) {
        setScore(data.activity_score);
      }
    };

    fetchInitialScore();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId]);

  return score;
}