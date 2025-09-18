import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useFloqStreamRealtime(floqId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!floqId) return;
    
    const channel = supabase
      .channel(`floq:${floqId}:messages`)
      .on("postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "chat_messages", 
          filter: `thread_id=eq.${floqId}` 
        },
        () => {
          qc.invalidateQueries({ queryKey: ["floq", floqId, "stream"] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, qc]);
}