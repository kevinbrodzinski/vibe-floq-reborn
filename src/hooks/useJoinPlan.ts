import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useJoinPlan(planId?: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error('Plan ID is required')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { error } = await supabase
        .from('plan_participants')
        .insert({
          plan_id: planId,
          profile_id: user.id,
        })

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['resolve-plan-slug'] })
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
      
      toast({
        title: "Joined plan!",
        description: "You're now part of this plan.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join plan",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  })
}