import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useLogInviteDecline() {
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({
      planId,
    }: {
      planId: string
    }) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('log_invite_decline', {
        p_user_id: user.id,
        p_plan_id: planId,
      })

      if (error) throw error
      return true
    },
    onSuccess: () => {
      toast({
        title: 'Preference updated',
        description: 'We\'ll learn from this and show better plans next time.',
      })
    },
    onError: (error: any) => {
      console.error('Failed to log decline:', error)
      toast({
        title: 'Could not update preferences',
        description: 'Something went wrong. Try again later.',
        variant: 'destructive',
      })
    },
  })
}