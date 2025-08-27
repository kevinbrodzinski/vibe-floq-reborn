import { usePlanStops } from '@/hooks/usePlanStops'
import { usePlanParticipants } from '@/hooks/usePlanParticipants'
import { Calendar, Users, MapPin } from 'lucide-react'
import { format } from 'date-fns'

interface ExecutionPlanHeaderProps {
  planId: string
  currentStopIndex: number
  progress: number
}

export function ExecutionPlanHeader({ planId, currentStopIndex, progress }: ExecutionPlanHeaderProps) {
  const { data: stops = [] } = usePlanStops(planId)
  const { data: participants = [] } = usePlanParticipants(planId)
  const typedParticipants = participants as any[]
  
  const currentStop = stops[currentStopIndex]
  const totalStops = (stops as any)?.length || 0

  return (
    <div className="space-y-4">
      {/* Plan Title & Progress */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {currentStop?.title || 'Plan Execution'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Stop {currentStopIndex + 1} of {totalStops}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Progress</div>
          <div className="text-lg font-semibold text-primary">{Math.round(progress)}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current Stop Info */}
      {currentStop && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {currentStop.start_time && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(currentStop.start_time), 'h:mm a')}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{typedParticipants.length} participants</span>
          </div>
          
          {currentStop.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{currentStop.address}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}