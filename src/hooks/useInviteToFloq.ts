import { useMutation, useQueryClient, UseMutateAsyncFunction } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteToFloqParams {
  floqId: string;
  inviteeIds: string[];
}

interface UseInviteToFloqReturn {
  // mutateAsync now returns whatever the edge-function returns (object with optional message)
  mutateAsync: UseMutateAsyncFunction<
    { message?: string },
    Error,
    InviteToFloqParams,
    unknown
  >;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useInviteToFloq(): UseInviteToFloqReturn {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ floqId, inviteeIds }: InviteToFloqParams) => {
      if (!user) throw new Error("Not authenticated");
      if (!floqId || inviteeIds.length === 0) throw new Error("Invalid parameters");

      const { data, error } = await supabase.functions.invoke("invite-to-floq", {
        body: { floq_id: floqId, invitee_ids: inviteeIds },
      });

      if (error) throw error;
      return (data ?? {}) as { message?: string };
    },

    onSuccess: (data, variables) => {
      const { floqId } = variables;

      // refresh any lists that depend on new invitations
      queryClient.invalidateQueries({ queryKey: ["pending-invites", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["floq-details", floqId] });

      toast({
        title: "Invitations sent",
        description: data?.message || "Invitations sent successfully",
      });
    },

    onError: (error) => {
      console.error("Failed to send invitations:", error);
      toast({
        variant: "destructive",
        title: "Failed to send invitations",
        description:
          error instanceof Error ? error.message : "Something went wrong – please try again.",
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