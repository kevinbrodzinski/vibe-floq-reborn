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

export function useInviteToFloq(): InviteToFloqReturn {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ floqId, inviteeIds }: InviteToFloqParams) => {
      if (!user) throw new Error("Not authenticated");
      if (!floqId || !inviteeIds.length) throw new Error("Invalid parameters");

      const { data, error } = await supabase.functions.invoke('invite-to-floq', {
        body: {
          floq_id: floqId,
          invitee_ids: inviteeIds,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const { floqId } = variables;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["pending-invites", user?.id],
      });
      
      queryClient.invalidateQueries({
        queryKey: ["floq-details", floqId],
      });

      // Show success message from server response
      toast({
        title: "Invitations sent",
        description: data?.message || "Invitations sent successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to send invitations:", error);
      toast({
        title: "Failed to send invitations",
        description: error instanceof Error ? error.message : "Please try again",
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