import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const mutation = useMutation<
    // Return type
    { message?: string } | null,
    // Error type
    Error,
    // Variables type
    InviteToFloqParams
  >({
    mutationFn: async ({ floqId, inviteeIds }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!floqId || inviteeIds.length === 0)
        throw new Error('No invitees selected');

      const { data, error } = await supabase.functions.invoke(
        'invite-to-floq',
        {
          body: {
            floq_id: floqId,
            invitee_ids: inviteeIds,
          },
        },
      );

      if (error) throw error;
      return data as { message?: string } | null;
    },

    onSuccess: (data, { floqId }) => {
      // Refresh any cached queries that rely on invites or floq details
      queryClient.invalidateQueries({
        queryKey: ['pending-invites', user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['floq-details', floqId],
      });

      toast({
        title: 'Invitations sent',
        description: data?.message || 'Your friends have been invited.',
      });
    },

    onError: (error) => {
      console.error('Failed to send invitations:', error);
      toast({
        title: 'Failed to send invitations',
        description:
          error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
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