import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRallyCreate(floqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ venueId, scope = "floq" as "floq"|"field", note }:
      { venueId?: string; scope?: "floq"|"field"; note?: string }) => {
      const { data, error } = await supabase.functions.invoke<{ id:string }>("rally-create", {
        body: { floq_id: floqId, scope, venue_id: venueId, note }
      });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-stream", floqId], exact: false });
    }
  });
}