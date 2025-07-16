import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics'

type PlanStatus = 'draft' | 'active' | 'closed' | 'cancelled'

interface UpdatePlanStatusParams {
  planId: string
  status: PlanStatus
}

export function useUpdatePlanStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { contextualHaptics, heavy } = useAdvancedHaptics()

  return useMutation<void, Error, UpdatePlanStatusParams>({
    mutationFn: async ({ planId, status }: UpdatePlanStatusParams) => {
      const { error } = await supabase
        .from('floq_plans')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'active' && { execution_started_at: new Date().toISOString() })
        })
        .eq('id', planId)

      if (error) {
        console.error('Plan status update error:', error)
        throw error
      }
    },
    onSuccess: (_, { planId, status }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['floq-plan', planId] })
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', planId] })

      // Haptic feedback for status transitions
      if (status === 'active') {
        contextualHaptics.confirmation()
      } else if (status === 'closed') {
        heavy() // Strong celebration haptic for completion
      }

      // Success toast
      const statusMessages = {
        draft: 'Plan saved as draft',
        active: 'Plan execution started! 🚀',
        closed: 'Plan completed! 🎉',
        cancelled: 'Plan cancelled'
      }

      toast({
        title: "Status updated",
        description: statusMessages[status] || `Plan status updated to ${status}`,
      })
    },
    onError: (error) => {
      console.error('Failed to update plan status:', error)
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: error?.message ?? "Something went wrong. Please try again.",
      })
    }
  })
}