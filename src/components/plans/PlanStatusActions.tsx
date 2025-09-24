import { Button } from '@/components/ui/button'
import { Play, CheckCircle, RotateCcw } from 'lucide-react'
import { useUpdatePlanStatus } from '@/hooks/useUpdatePlanStatus'
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation'
import { celebrationEffects } from '@/lib/confetti'
import { cn } from '@/lib/utils'

interface PlanStatusActionsProps {
  planId: string
  currentStatus: string
  isCreator: boolean
  hasStops?: boolean
  hasParticipants?: boolean
  className?: string
}

export function PlanStatusActions({ 
  planId, 
  currentStatus, 
  isCreator,
  hasStops = true,
  hasParticipants = true,
  className 
}: PlanStatusActionsProps) {
  const { mutate: updateStatus, isPending } = useUpdatePlanStatus()
  const { validateTransition, isTerminalStatus, getStatusActionLabel } = usePlanStatusValidation()

  const handleStatusTransition = (newStatus: 'executing' | 'completed') => {
    // Validate transition before proceeding
    const validation = validateTransition(currentStatus as any, newStatus, {
      hasStops,
      hasParticipants,
      isCreator,
      isActive: !isTerminalStatus(currentStatus as any)
    })

    if (!validation.isValid) {
      console.warn('Invalid transition:', validation.reason)
      return
    }

    updateStatus({ planId, status: newStatus })
  }

  // Don't show actions if not creator
  if (!isCreator) return null

  // Status transition buttons based on current status
  const getAvailableActions = () => {
    // No actions for terminal states
    if (isTerminalStatus(currentStatus as any)) {
      return null
    }

    switch (currentStatus) {
      case 'draft':
        return null // Draft -> finalized is handled by existing finalize flow
      
      case 'finalized': {
        const validation = validateTransition('finalized', 'executing', {
          hasStops,
          hasParticipants,
          isCreator,
          isActive: true
        })

        return (
          <Button
            onClick={() => handleStatusTransition('executing')}
            disabled={isPending || !validation.isValid}
            className={cn('gap-2', className)}
            variant="default"
            title={validation.isValid ? undefined : validation.reason}
          >
            <Play className="w-4 h-4" />
            {getStatusActionLabel('executing')}
          </Button>
        )
      }
      
      case 'executing': {
        const validation = validateTransition('executing', 'completed', {
          hasStops,
          hasParticipants,
          isCreator,
          isActive: true
        })

        return (
          <Button
            onClick={() => handleStatusTransition('completed')}
            disabled={isPending || !validation.isValid}
            className={cn('gap-2', className)}
            variant="default"
            title={validation.isValid ? undefined : validation.reason}
          >
            <CheckCircle className="w-4 h-4" />
            {getStatusActionLabel('completed')}
          </Button>
        )
      }
      
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-2">
      {getAvailableActions()}
    </div>
  )
}