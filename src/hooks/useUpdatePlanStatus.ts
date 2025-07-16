import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics'
import { celebrationEffects } from '@/lib/confetti'
import { useFinalizePlan } from '@/hooks/useFinalizePlan'

type PlanStatus = 'draft' | 'finalized' | 'executing' | 'completed' | 'cancelled'

interface UpdatePlanStatusParams {
  planId: string
  status: PlanStatus
  forceFinalize?: boolean // For draft->finalized integration
}

interface PlanStatusTransition {
  from: PlanStatus
  to: PlanStatus
  requiresConfirmation: boolean
  celebrationType: 'none' | 'haptic' | 'confetti' | 'major'
}

export function useUpdatePlanStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { contextualHaptics, heavy } = useAdvancedHaptics()
  const finalizePlan = useFinalizePlan()

  // Define valid status transitions
  const statusTransitions: PlanStatusTransition[] = [
    { from: 'draft', to: 'finalized', requiresConfirmation: false, celebrationType: 'haptic' },
    { from: 'finalized', to: 'executing', requiresConfirmation: true, celebrationType: 'confetti' },
    { from: 'executing', to: 'completed', requiresConfirmation: true, celebrationType: 'major' },
    { from: 'draft', to: 'cancelled', requiresConfirmation: true, celebrationType: 'haptic' },
    { from: 'finalized', to: 'cancelled', requiresConfirmation: true, celebrationType: 'haptic' },
  ]

  const isValidTransition = (from: PlanStatus, to: PlanStatus): boolean => {
    return statusTransitions.some(t => t.from === from && t.to === to)
  }

  const getCelebrationLevel = (from: PlanStatus, to: PlanStatus): PlanStatusTransition['celebrationType'] => {
    const transition = statusTransitions.find(t => t.from === from && t.to === to)
    return transition?.celebrationType || 'none'
  }

  return useMutation<void, Error, UpdatePlanStatusParams>({
    mutationFn: async ({ planId, status, forceFinalize }: UpdatePlanStatusParams) => {
      // Special handling for draft → finalized transition
      if (status === 'finalized') {
        try {
          await finalizePlan.mutateAsync({ 
            plan_id: planId, 
            force_finalize: forceFinalize 
          })
          return // Return void to match mutation type
        } catch (error) {
          console.error('Plan finalization via edge function failed:', error)
          throw error
        }
      }

      // Direct status updates for other transitions
      const updateData: any = { status }
      
      // Add timestamp fields for specific statuses
      if (status === 'executing') {
        updateData.execution_started_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('floq_plans')
        .update(updateData)
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
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })

      // Enhanced celebration effects for specific status transitions
      switch (status) {
        case 'finalized':
          contextualHaptics.confirmation()
          setTimeout(() => celebrationEffects.planFinalized(), 300)
          break
        case 'executing':
          contextualHaptics.confirmation()
          setTimeout(() => celebrationEffects.planExecuting(), 300)
          break
        case 'completed':
          contextualHaptics.confirmation()
          setTimeout(() => celebrationEffects.planCompleted(), 500)
          break
        case 'cancelled':
          contextualHaptics.cancellation()
          break
        default:
          contextualHaptics.confirmation()
          break
      }

      // Enhanced success messages with emojis
      const statusMessages = {
        draft: 'Plan saved as draft 📝',
        finalized: 'Plan finalized and ready to execute! 📋✨',
        executing: 'Plan execution started! 🚀 Let the adventure begin!',
        completed: 'Plan completed! 🎉 What an amazing experience!',
        cancelled: 'Plan cancelled 🚫'
      }

      toast({
        title: "Status Updated",
        description: statusMessages[status] || `Plan status updated to ${status}`,
      })
    },
    onError: (error) => {
      console.error('Failed to update plan status:', error)
      
      // Enhanced error handling with retry suggestions
      const errorMessage = error?.message ?? "Something went wrong. Please try again."
      
      toast({
        variant: "destructive",
        title: "Failed to Update Status",
        description: errorMessage,
      })
    },
    
    // Optimistic updates for better UX
    onMutate: async ({ planId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['floq-plan', planId] })
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['floq-plan', planId])
      
      // Optimistically update to the new status
      queryClient.setQueryData(['floq-plan', planId], (old: any) => 
        old ? { ...old, status } : old
      )
      
      // Return a context object with the snapshotted value
      return { previousPlan, planId }
    },
    
    onSettled: (data, error, variables, context) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['floq-plan', variables.planId] })
      
      if (error && context && typeof context === 'object' && 'planId' in context && 'previousPlan' in context) {
        // Roll back optimistic update on error
        queryClient.setQueryData(['floq-plan', (context as any).planId], (context as any).previousPlan)
      }
    }
  })
}