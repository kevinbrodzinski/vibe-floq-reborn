import { Progress } from "@/components/ui/progress"
import { usePlanProgress } from "@/hooks/usePlanProgress"
import type { PlanStop } from "@/types/plan"

interface PlanProgressBarProps {
  plan?: { title?: string; description?: string }
  stops: PlanStop[]
  showDetails?: boolean
  className?: string
}

export function PlanProgressBar({ 
  plan, 
  stops, 
  showDetails = false,
  className = "" 
}: PlanProgressBarProps) {
  const { 
    progressPercentage, 
    readyStops, 
    totalStops,
    isComplete 
  } = usePlanProgress(plan, stops)

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Plan Progress
        </span>
        <span className="text-sm text-muted-foreground">
          {progressPercentage}%
        </span>
      </div>
      
      <Progress 
        value={progressPercentage} 
        className="h-2"
      />
      
      {showDetails && (
        <div className="mt-2 text-xs text-muted-foreground">
          {readyStops}/{totalStops} stops ready
          {isComplete && (
            <span className="ml-2 text-green-600 font-medium">
              ✓ Ready to finalize
            </span>
          )}
        </div>
      )}
    </div>
  )
}