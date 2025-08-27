import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RespondToInvitationInput {
  invitationId: string;
  status: 'accepted' | 'declined';
}

/**
 * Hook to respond to plan invitations
 */
export function useRespondToInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, status }: RespondToInvitationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update invitation status
      const { error: inviteError } = await supabase
        .from('plan_invitations')
        .update({
          status,
          responded_at: new Date().toISOString(),
        } as any)
        .eq('id', invitationId as any)
        .eq('invitee_profile_id', user.id as any)
        .returns<any>();

      if (inviteError) throw inviteError;

      // If accepted, add user as participant
      if (status === 'accepted') {
        // Get the plan_id from the invitation
        const { data: invitation, error: fetchError } = await supabase
          .from('plan_invitations')
          .select('plan_id')
          .eq('id', invitationId as any)
          .single()
          .returns<any>();

        if (fetchError) throw fetchError;

        // Add to plan participants
        const { error: participantError } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: (invitation as any).plan_id,
            profile_id: user.id,
            joined_at: new Date().toISOString(),
          } as any)
          .returns<any>();

        if (participantError && !participantError.message.includes('duplicate')) {
          throw participantError;
        }
      }

      return { status };
    },
    onSuccess: (result, { status }) => {
      // Invalidate pending invitations to update the UI
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      
      // Also invalidate user's plans if they accepted
      if (status === 'accepted') {
        queryClient.invalidateQueries({ queryKey: ['user-plans'] });
        queryClient.invalidateQueries({ queryKey: ['plan-participants'] });
      }

      toast({
        title: status === 'accepted' ? 'Invitation Accepted!' : 'Invitation Declined',
        description: status === 'accepted' 
          ? "You've joined the plan. Check your plans to see details!"
          : "You've declined the invitation.",
      });
    },
    onError: (error) => {
      console.error('Failed to respond to invitation:', error);
      toast({
        title: 'Response Failed',
        description: 'Could not respond to invitation. Please try again.',
        variant: 'destructive',
      });
    },
  });
}