import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DraggableTimelineGrid } from './DraggableTimelineGrid'
import { PlanTimeWindowSelector } from './PlanTimeWindowSelector'
import { EditStopModal } from './EditStopModal'
import { TimelineOverlapValidator } from './TimelineOverlapValidator'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUpdatePlan } from '@/hooks/useUpdatePlan'
import { Clock, Settings, Users, DollarSign } from 'lucide-react'

interface PlanTimelineProps {
  plan: {
    id: string
    title: string
    description?: string
    start_time?: string
    end_time?: string
    duration_hours?: number
  }
}

export function PlanTimeline({ plan }: PlanTimelineProps) {
  const [showTimeWindowSelector, setShowTimeWindowSelector] = useState(!plan.start_time || !plan.end_time)
  const [editingStop, setEditingStop] = useState<any>(null)

  const { data: stops = [] } = usePlanStops(plan.id)
  const updatePlan = useUpdatePlan()

  const handleTimeWindowConfirm = async (startTime: string, endTime: string) => {
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        start_time: startTime,
        end_time: endTime,
      })
      setShowTimeWindowSelector(false)
    } catch (error) {
      console.error('Error updating plan time window:', error)
    }
  }

  const calculateTotalCost = () => {
    return stops.reduce((total, stop) => {
      return total + (stop.estimated_cost_per_person || 0)
    }, 0)
  }

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start || !end) return null
    
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }
    
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  if (showTimeWindowSelector) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>{plan.title}</CardTitle>
          <p className="text-muted-foreground">First, let's set up your time window</p>
        </CardHeader>
        <CardContent>
          <PlanTimeWindowSelector
            onConfirm={handleTimeWindowConfirm}
            defaultStartTime={plan.start_time}
            defaultEndTime={plan.end_time}
          />
        </CardContent>
      </Card>
    )
  }

  const timeRange = formatTimeRange(plan.start_time, plan.end_time)
  const totalCost = calculateTotalCost()

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan.title}
                <Badge variant="outline" className="text-xs">
                  {plan.duration_hours}h plan
                </Badge>
              </CardTitle>
              {plan.description && (
                <p className="text-muted-foreground mt-1">{plan.description}</p>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeWindowSelector(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Window
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center gap-6 text-sm">
            {timeRange && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{timeRange}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{stops.length} stop{stops.length !== 1 ? 's' : ''}</span>
            </div>
            
            {totalCost > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>~${totalCost.toFixed(2)}/person</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overlap Warnings */}
      <TimelineOverlapValidator stops={stops} />

      {/* Timeline Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag stops to reorder or move between time slots
          </p>
        </CardHeader>
        <CardContent>
          <DraggableTimelineGrid
            planId={plan.id}
            startTime={plan.start_time}
            endTime={plan.end_time}
          />
        </CardContent>
      </Card>

      {/* Edit Stop Modal */}
      <EditStopModal
        isOpen={!!editingStop}
        onClose={() => setEditingStop(null)}
        stop={editingStop}
      />
    </div>
  )
}