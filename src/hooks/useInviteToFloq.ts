import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
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
 * Send invitations to a floq via the `invite-to-floq` Edge Function.
 * Adds the current auth access-token in the headers so RLS validates correctly.
 */
export function useInviteToFloq(): InviteToFloqReturn {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ floqId, inviteeIds }: InviteToFloqParams) => {
      if (!session?.access_token) throw new Error("Not authenticated");
      if (!floqId || inviteeIds.length === 0)
        throw new Error("Invalid parameters");

      const { data, error } = await supabase.functions.invoke(
        "invite-to-floq",
        {
          // ⇢ key bit: pass the access token so the edge function can call back
          //   into Supabase with row-level-security intact
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Prefer: "return=minimal", // edge-function returns 204 unless it sets a body
          },
          body: {
            floq_id: floqId,
            invitee_ids: inviteeIds,
          },
        }
      );

      if (error) throw error;
      return data; // can be undefined when Prefer: return=minimal
    },

    onSuccess: (_data, variables) => {
      const { floqId } = variables;

      // refetch local caches that might now include pending invites
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