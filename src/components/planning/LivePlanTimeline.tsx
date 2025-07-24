import { useState, useCallback, useMemo } from 'react'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useVenueStaysChannel, type StayEvent } from '@/hooks/useVenueStaysChannel'
import { usePlanCheckinToast } from '@/hooks/usePlanCheckinToast'
import { useToast } from '@/hooks/use-toast'
import { DraggableStopCard } from './DraggableStopCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LivePlanTimelineProps {
  planId: string
  className?: string
}

export function LivePlanTimeline({ planId, className }: LivePlanTimelineProps) {
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const { toast } = useToast()
  const [venueStatuses, setVenueStatuses] = useState<Record<string, 'enroute' | 'arrived' | 'departed'>>({})

  // Initialize checkin toast listener
  usePlanCheckinToast(planId)

  // Handle venue stay events
  const handleStayEvent = useCallback((event: StayEvent) => {
    if (event.plan_id !== planId || !event.stop_id) return

    if (event.type === 'stay_insert') {
      // Someone arrived at a venue
      setVenueStatuses(prev => ({
        ...prev,
        [event.stop_id]: 'arrived'
      }))
      
      // Show toast for other users
      toast({
        title: 'Friend arrived! 🎉',
        description: `Someone just arrived at a stop`
      })
    }
    
    if (event.type === 'stay_depart') {
      // Someone left a venue
      setVenueStatuses(prev => ({
        ...prev,
        [event.stop_id]: 'departed'
      }))
      
      // Show departure toast
      toast({
        title: 'Friend departed',
        description: `Someone left a venue`
      })
    }
  }, [planId, toast])

  // Subscribe to venue stays channel
  useVenueStaysChannel(handleStayEvent)

  // Memoized stops with status
  const stopsWithStatus = useMemo(() => {
    return stops.map(stop => {
      // Transform the stop data to match DraggableStopCard interface
      return {
        id: stop.id,
        title: stop.title,
        description: stop.description,
        start_time: stop.startTime || stop.start_time || '',
        end_time: stop.endTime || stop.end_time || '',
        duration_minutes: stop.duration_minutes,
        estimated_cost_per_person: stop.estimated_cost_per_person,
        venue: typeof stop.venue === 'string' ? 
          { id: stop.venue, name: stop.venue } : 
          stop.venue || undefined,
        venueStatus: venueStatuses[stop.id] || 'enroute'
      }
    })
  }, [stops, venueStatuses])

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (stops.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-4xl mb-2">📍</div>
        <p className="text-muted-foreground">No stops added yet</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Plan Timeline</h3>
        <Badge variant="outline" className="text-xs">
          {stops.length} stop{stops.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      {stopsWithStatus.map((stop) => (
        <DraggableStopCard
          key={stop.id}
          stop={stop}
          planId={planId}
          showQuickActions={true}
          compact={false}
        />
      ))}
    </div>
  )
}