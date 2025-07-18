import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteToFloqParams {
  floqId: string;
  inviteeIds: string[];
}

interface InviteToFloqReturn {
  mutateAsync: (params: InviteToFloqParams) => Promise<void>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Calls the `invite-to-floq` Edge Function and passes the *fresh* access token
 * obtained directly from `supabase.auth.getSession()` so that RLS checks succeed.
 */
export function useInviteToFloq(): InviteToFloqReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ floqId, inviteeIds }: InviteToFloqParams) => {
      if (!floqId || inviteeIds.length === 0) {
        throw new Error("Invalid parameters");
      }

      /* ------------------------------------------------------------------ */
      /* 1️⃣  Get the *fresh* session on demand (bypasses React context lag) */
      /* ------------------------------------------------------------------ */
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) throw sessionErr;
      if (!session?.access_token) throw new Error("Not authenticated");
      /* ------------------------------------------------------------------ */

      const { data, error } = await supabase.functions.invoke("invite-to-floq", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Prefer: "return=minimal",
        },
        body: {
          floq_id: floqId,
          invitee_ids: inviteeIds,
        },
      });

      if (error) throw error;
      return data; // can be undefined when Prefer: return=minimal
    },

    onSuccess: (_data, variables) => {
      const { floqId } = variables;

      // Refresh any queries that might show new pending invites / updated floq
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      queryClient.invalidateQueries({ queryKey: ["floq-details", floqId] });

      toast({
        title: "Invitations sent",
        description: "Your friends will be notified shortly.",
      });
    },

    onError: (error) => {
      console.error("Failed to send invitations:", error);
      toast({
        title: "Couldn’t send invites",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}