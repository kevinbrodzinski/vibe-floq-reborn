import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFloqRoom(
  id: string,
  onEvent: (e: { type: string; payload: any }) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`floq:${id}:state`)
      .on("broadcast", { event: "state" }, (payload) =>
        onEvent({ type: "state", payload })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, onEvent]);
}