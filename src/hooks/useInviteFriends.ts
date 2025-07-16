import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface InviteExternalFriendsParams {
  plan_id: string
  emails: string[]
  message?: string
}

export function useInviteFriends() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: InviteExternalFriendsParams) => {
      const { data, error } = await supabase.functions.invoke('invite-external-friends', {
        body: params
      })
      
      if (error) {
        console.error('Friend invitation error:', error)
        throw new Error(error.message || 'Failed to send invitations')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate plan participants and invitations
      queryClient.invalidateQueries({ queryKey: ['plan-participants', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-invitations', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      
      const invitedCount = data.invited?.length || 0
      const alreadyInvitedCount = data.already_invited?.length || 0
      
      if (invitedCount > 0) {
        toast({
          title: "Invitations sent!",
          description: `Successfully invited ${invitedCount} friends to your plan.`,
        })
      }
      
      if (alreadyInvitedCount > 0) {
        toast({
          title: "Some friends already invited",
          description: `${alreadyInvitedCount} friends were already invited to this plan.`,
        })
      }
    },
    onError: (error) => {
      console.error('Friend invitation failed:', error)
      toast({
        variant: "destructive",
        title: "Failed to send invitations",
        description: error.message || "Something went wrong. Please try again.",
      })
    }
  })
}