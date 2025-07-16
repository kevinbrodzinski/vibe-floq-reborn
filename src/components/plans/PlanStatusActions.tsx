import { Button } from '@/components/ui/button'
import { Play, CheckCircle, RotateCcw } from 'lucide-react'
import { useUpdatePlanStatus } from '@/hooks/useUpdatePlanStatus'
import { triggerConfetti } from '@/lib/confetti'
import { cn } from '@/lib/utils'

interface PlanStatusActionsProps {
  planId: string
  currentStatus: string
  isCreator: boolean
  className?: string
}

export function PlanStatusActions({ 
  planId, 
  currentStatus, 
  isCreator, 
  className 
}: PlanStatusActionsProps) {
  const { mutate: updateStatus, isPending } = useUpdatePlanStatus()

  const handleStatusTransition = (newStatus: 'executing' | 'completed') => {
    updateStatus({ planId, status: newStatus })
    
    // Trigger confetti for completion
    if (newStatus === 'completed') {
      setTimeout(() => triggerConfetti(4000), 500)
    }
  }

  // Don't show actions if not creator
  if (!isCreator) return null

  // Status transition buttons based on current status
  const getAvailableActions = () => {
    switch (currentStatus) {
      case 'draft':
        return null // Draft -> finalized is handled by existing finalize flow
      
      case 'finalized':
        return (
          <Button
            onClick={() => handleStatusTransition('executing')}
            disabled={isPending}
            className={cn('gap-2', className)}
            variant="default"
          >
            <Play className="w-4 h-4" />
            Start Execution
          </Button>
        )
      
      case 'executing':
        return (
          <Button
            onClick={() => handleStatusTransition('completed')}
            disabled={isPending}
            className={cn('gap-2', className)}
            variant="default"
          >
            <CheckCircle className="w-4 h-4" />
            Complete Plan
          </Button>
        )
      
      case 'completed':
      case 'cancelled':
        return null // No actions for completed/cancelled plans
      
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