import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useSession } from '@/hooks/useSession'

interface FinishPlanParams {
  planId: string
}

export function useFinishPlan() {
  const session = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ planId }: FinishPlanParams) => {
      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase.rpc('finish_plan', {
        p_plan_id: planId,
        p_profile_id: session.user.id
      })
      
      if (error) {
        console.error('Plan finish error:', error)
        throw new Error(error.message || 'Failed to finish plan')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['floq-plans', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.planId] })
      
      toast.success('Plan finished successfully!', {
        description: 'Auto-disband floqs have been archived and activities logged.',
      })
    },
    onError: (error) => {
      console.error('Plan finish failed:', error)
      toast.error('Failed to finish plan', {
        description: error.message || 'Something went wrong. Please try again.',
      })
    }
  })
}