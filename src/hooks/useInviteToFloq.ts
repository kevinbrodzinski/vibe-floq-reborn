import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInviteToFloq() {
  return useMutation({
    mutationFn: async ({ floqId, inviteeIds }: { floqId: string; inviteeIds: string[] }) => {
      // Send invitations to multiple users
      const promises = inviteeIds.map(inviteeId => 
        supabase.functions.invoke("floq-invite", { 
          body: { floq_id: floqId, invitee_profile_id: inviteeId } 
        })
      );
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error(`Failed to invite ${errors.length} users`);
    }
  });
}