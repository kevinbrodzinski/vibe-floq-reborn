import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation<
    { message?: string } | null,
    Error,
    InviteToFloqParams
  >({
    mutationFn: async ({ floqId, inviteeIds }) => {
      // ⚠️ Get the freshest session *inside* the mutation
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) throw new Error('Not authenticated');
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
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['floq-details', floqId] });

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