import { useEffect } from 'react'
import { useUpdatePlanStatus } from '@/hooks/useUpdatePlanStatus'
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation'
import { toastInfo } from '@/lib/toast'

interface PlanAutoProgressionProps {
  planId: string
  planStatus: string
  stops: Array<{ id: string; status?: string; end_time?: string }>
  isCreator: boolean
  enabled?: boolean
}

/**
 * Hook to automatically progress plan status based on completion conditions
 */
export function usePlanAutoProgression({
  planId,
  planStatus,
  stops,
  isCreator,
  enabled = true
}: PlanAutoProgressionProps) {
  const { mutate: updateStatus } = useUpdatePlanStatus()
  const { validateTransition } = usePlanStatusValidation()

  useEffect(() => {
    if (!enabled || !isCreator || planStatus !== 'executing') {
      return
    }

    // Check if all stops are completed
    const allStopsCompleted = stops.length > 0 && stops.every(stop => 
      stop.status === 'completed' || 
      (stop.end_time && new Date(stop.end_time) < new Date())
    )

    // Check if plan execution time has passed (all stops should be finished)
    const currentTime = new Date()
    const lastStopEndTime = stops
      .map(stop => stop.end_time ? new Date(stop.end_time) : null)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0]

    const shouldAutoComplete = allStopsCompleted || 
      (lastStopEndTime && currentTime > lastStopEndTime)

    if (shouldAutoComplete) {
      // Validate the transition is allowed
      const validation = validateTransition(planStatus as any, 'completed', {
        hasStops: stops.length > 0,
        hasParticipants: true, // Assume has participants if plan is executing
        isCreator,
        isActive: true
      })

      if (validation.isValid) {
        // Auto-complete the plan
        updateStatus(
          { planId, status: 'completed' },
          {
            onSuccess: () => {
              toastInfo(
                'Plan Completed!', 
                'All stops have been finished. Your plan has been automatically completed.'
              )
            },
            onError: (error) => {
              console.error('Failed to auto-complete plan:', error)
            }
          }
        )
      }
    }
  }, [planId, planStatus, stops, isCreator, enabled, updateStatus, validateTransition])

  return {
    // Could expose additional auto-progression controls here if needed
    enabled
  }
}