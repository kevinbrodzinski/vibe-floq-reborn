import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEndFloq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (floqId: string) => {
      const { data, error } = await supabase.rpc('end_floq', {
        p_floq_id: floqId,
        p_reason: 'manual'
      });

      if (error) {
        console.error('End floq error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["my-flocks"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-flocks"] });
      queryClient.invalidateQueries({ queryKey: ["floq-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["active-floqs"] });
    },
  });
}