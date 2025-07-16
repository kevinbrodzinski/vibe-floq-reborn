import { useMemo } from 'react'
import { checkStopConflicts } from '@/utils/stopTimeUtils'
import { useNovaTimeSuggestions } from './useNovaTimeSuggestions'
import type { PlanStop } from '@/types/plan'

export interface TimelineStopData extends PlanStop {
  isDragging: boolean
  isConflicting: boolean
  snapSuggestion?: {
    startTime: string
    endTime: string
    confidence: number
    reason?: string
  }
}

export function useTimelineGridLogic(
  planStops: PlanStop[], 
  currentDragStopId?: string,
  planId?: string
) {
  const { data: suggestions } = useNovaTimeSuggestions({ planId, enabled: !!planId })

  return useMemo(() => {
    const conflictingIds = checkStopConflicts(planStops)
    
    return planStops.map(stop => {
      const isDragging = stop.id === currentDragStopId
      const isConflicting = conflictingIds.includes(stop.id)
      
      // Find AI suggestion for this stop
      const snapSuggestion = suggestions?.find(s => 
        s.stopId === stop.id || 
        Math.abs(new Date(`2000-01-01T${s.startTime}`).getTime() - 
                 new Date(`2000-01-01T${stop.start_time}`).getTime()) < 30 * 60 * 1000
      )

      return {
        ...stop,
        isDragging,
        isConflicting,
        snapSuggestion: snapSuggestion ? {
          startTime: snapSuggestion.startTime,
          endTime: snapSuggestion.endTime,
          confidence: snapSuggestion.confidence,
          reason: snapSuggestion.reason
        } : undefined
      } as TimelineStopData
    })
  }, [planStops, currentDragStopId, suggestions])
}