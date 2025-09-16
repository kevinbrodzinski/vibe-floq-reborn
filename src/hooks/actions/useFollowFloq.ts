import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useFollowFloq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ floqId }: { floqId: string }) => {
      const { data, error } = await supabase.functions.invoke("floq-actions", {
        body: { action: "follow", floq_id: floqId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { floqId }) => {
      toast({ description: "Following floq." });
      qc.invalidateQueries();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("floq:followed", { detail: { id: floqId } }));
      }
    },
    onError: (err) => toast({ variant: "destructive", description: err?.message ?? "Failed to follow." }),
  });
}