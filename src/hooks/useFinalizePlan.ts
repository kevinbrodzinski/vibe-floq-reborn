import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface FinalizePlanParams {
  plan_id: string
  force_finalize?: boolean
}

export function useFinalizePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: FinalizePlanParams) => {
      const { data, error } = await supabase.functions.invoke('finalize-plan', {
        body: params
      })
      
      if (error) {
        console.error('Plan finalization error:', error)
        throw new Error(error.message || 'Failed to finalize plan')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate all plan-related queries
      queryClient.invalidateQueries({ queryKey: ['floq-plans', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
      
      toast({
        title: "Plan finalized!",
        description: "Your plan has been successfully finalized and is ready to go.",
      })
    },
    onError: (error) => {
      console.error('Plan finalization failed:', error)
      toast({
        variant: "destructive",
        title: "Failed to finalize plan",
        description: error.message || "Something went wrong. Please try again.",
      })
    }
  })
}