import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInviteToFloq() {
  return useMutation({
    mutationFn: async ({ floqId, inviteeProfileId }: { floqId: string; inviteeProfileId: string }) => {
      const { error } = await supabase.functions.invoke("floq-invite", { 
        body: { floq_id: floqId, invitee_profile_id: inviteeProfileId } 
      });
      if (error) throw error;
    }
  });
}