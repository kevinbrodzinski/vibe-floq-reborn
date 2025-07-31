import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarkThreadRead() {
  return useMutation({
    mutationFn: async (params: { 
      surface: "dm" | "floq" | "plan"; 
      threadId: string;
    }) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Authentication required");

      const { data, error } = await supabase.functions.invoke('mark-thread-read', {
        body: {
          p_surface: params.surface,
          p_thread_id: params.threadId,
          p_profile_id: user.id,
        }
      });

      if (error) throw error;
      return data;
    },
  });
}