import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface FinalizePlanParams {
  plan_id: string
  force_finalize?: boolean
}

interface FinalizePlanResponse {
  success: boolean
  plan?: any
  final_stops?: any[]
  floq_id?: string
  kind?: string
}

export function useFinalizePlan() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<FinalizePlanResponse, Error, FinalizePlanParams>({
    mutationFn: async (params: FinalizePlanParams) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication required')
      
      const { data, error } = await supabase.rpc('finalize_plan', {
        _plan_id: params.plan_id,
        _selections: [],
        _creator: user.id
      })
      
      if (error) {
        console.error('Plan finalization error:', error)
        const message = error?.message ?? 'Something went wrong on the server'
        throw new Error(message)
      }
      
      return data ? (data as unknown as FinalizePlanResponse) : { success: false }
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
        description: error?.message ?? "Something went wrong. Please try again.",
      })
    }
  })
}