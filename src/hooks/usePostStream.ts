import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePostStream(floqId?: string) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { body: string; kind?: string }) => {
      const { error } = await supabase.functions.invoke("hq-stream-post", {
        body: { 
          floq_id: floqId, 
          kind: payload.kind ?? "text", 
          body: payload.body 
        }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floq", floqId, "stream"] });
    }
  });
}