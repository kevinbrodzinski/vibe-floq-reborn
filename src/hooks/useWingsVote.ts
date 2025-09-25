import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWingsVote(floqId: string, eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (optionIdx: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("auth required");
      const { error } = await supabase
        .from("floq_wings_votes")
        .upsert({ event_id: eventId, profile_id: user.id, option_idx: optionIdx });
      if (error) throw error;
      return optionIdx;
    },
    onMutate: async (optionIdx) => {
      await qc.cancelQueries({ queryKey: ["wings-tally", eventId] });
      const prev = qc.getQueryData<{ option_idx:number; votes:number }[]>(["wings-tally", eventId]);
      if (prev) {
        const next = prev.map(x => x.option_idx === optionIdx ? { ...x, votes: x.votes + 1 } : x);
        if (!next.find(x => x.option_idx === optionIdx)) next.push({ option_idx: optionIdx, votes: 1 });
        qc.setQueryData(["wings-tally", eventId], next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["wings-tally", eventId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wings-tally", eventId] });
      qc.invalidateQueries({ queryKey: ["smart-stream", floqId], exact: false });
    }
  });
}