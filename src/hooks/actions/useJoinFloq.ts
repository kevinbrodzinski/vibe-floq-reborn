import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type JoinInput = { floqId: string };

export function useJoinFloq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ floqId }: JoinInput) => {
      const { data, error } = await supabase.functions.invoke("floq-actions", {
        body: { action: "join", floq_id: floqId },
      });
      if (error) throw error;
      return data;
    },
    onMutate: async ({ floqId }) => {
      // optimistic: bump counts in hub lists
      const prev: any[] = [];
      const bump = (list?: any[]) =>
        list?.map((f) => (f.id === floqId ? { ...f, participants: (f.participants ?? 0) + 1 } : f)) ?? [];

      // naive invalidation (safe default)
      await qc.cancelQueries();
      prev.push(qc.getQueriesData({}));

      // If you have specific keys, bump them here using setQueryData.
      // Else, rely on invalidate below.
      return { prev };
    },
    onSuccess: (_data, { floqId }) => {
      toast({ description: "Joined floq." });
      // Refresh lists
      qc.invalidateQueries();
      // broadcast if needed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("floq:joined", { detail: { id: floqId } }));
      }
    },
    onError: (err: any, { floqId }, ctx) => {
      toast({ variant: "destructive", description: err?.message ?? "Failed to join." });
      // rollback if you stored prev snapshots
      if (ctx?.prev) {
        for (const [key, value] of ctx.prev as Array<[unknown, unknown]>) {
          qc.setQueryData(key as any, value);
        }
      }
    },
  });
}