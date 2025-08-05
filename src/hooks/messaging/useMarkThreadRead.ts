import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supaFn } from "@/lib/supaFn";

export function useMarkThreadRead() {
  return useMutation({
    mutationFn: async (params: { 
      surface: "dm" | "floq" | "plan"; 
      threadId: string;
    }) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Authentication required");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No auth session");

      const res = await supaFn(
        'mark-thread-read',
        session.access_token,
        {
          p_surface: params.surface,
          p_thread_id: params.threadId,
          p_profile_id: user.id,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to mark thread read: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      return data;
    },
  });
}