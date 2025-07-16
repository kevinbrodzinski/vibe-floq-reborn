import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useTrackInviteRSVP() {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({
      planId,
      invitationId,
      accept,
    }: {
      planId: string
      invitationId: string
      accept: boolean
    }) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      // 1. Update the plan_invitations table
      const { error: inviteUpdateError } = await supabase
        .from('plan_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId)

      if (inviteUpdateError) throw inviteUpdateError

      // 2. If accepted, insert into plan_participants
      if (accept) {
        const { error: participantInsertError } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: planId,
            user_id: user.id,
            invite_type: 'invitation',
          })

        // Handle duplicate participant gracefully
        if (participantInsertError && !participantInsertError.message?.includes('duplicate')) {
          throw participantInsertError
        }
      }

      // 3. If declined, log feedback to preferences
      if (!accept) {
        const { error: declineError } = await supabase.rpc('log_invite_decline', {
          p_user_id: user.id,
          p_plan_id: planId,
        })
        if (declineError) throw declineError
      }

      return { success: true, accepted: accept }
    },

    onSuccess: (_, { accept }) => {
      toast({
        title: accept ? 'You\'ve joined the plan!' : 'Invite declined',
        description: accept
          ? 'We added you to the plan participants.'
          : 'Thanks! We\'ll adjust your recommendations.',
      })
    },

    onError: (error) => {
      console.error('RSVP error:', error)
      toast({
        title: 'Something went wrong',
        description: 'We couldn\'t process your invite response.',
        variant: 'destructive',
      })
    },
  })
}