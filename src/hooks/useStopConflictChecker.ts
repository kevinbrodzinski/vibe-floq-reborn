import { useMemo } from 'react'
import type { PlanStop } from '@/types/plan'
import { checkStopConflicts, isOverlapping } from '@/utils/stopTimeUtils'

export interface ConflictInfo {
  stopId: string
  conflictsWith: string[]
  type: 'time_overlap' | 'travel_impossible' | 'venue_closed'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestion?: string
}

export function useStopConflictChecker(stops: PlanStop[]) {
  const conflicts = useMemo(() => {
    const conflictingIds = checkStopConflicts(stops)
    const conflictDetails: ConflictInfo[] = []

    conflictingIds.forEach(stopId => {
      const stop = stops.find(s => s.id === stopId)
      if (!stop) return

      const conflictsWith = stops
        .filter(other => other.id !== stopId && isOverlapping(stop, [other]))
        .map(other => other.id)

      if (conflictsWith.length > 0) {
        conflictDetails.push({
          stopId,
          conflictsWith,
          type: 'time_overlap',
          severity: conflictsWith.length > 1 ? 'high' : 'medium',
          message: `${stop.title} overlaps with ${conflictsWith.length} other stop${conflictsWith.length > 1 ? 's' : ''}`,
          suggestion: 'Adjust the timing or duration to resolve the conflict'
        })
      }
    })

    return conflictDetails
  }, [stops])

  const hasConflicts = conflicts.length > 0
  
  const getConflictForStop = (stopId: string) => 
    conflicts.find(conflict => conflict.stopId === stopId)

  const isStopConflicting = (stopId: string) => 
    conflicts.some(conflict => conflict.stopId === stopId)

  const resolveConflict = (stopId: string, newStartTime: string, newDuration?: number) => {
    // This would be implemented to automatically resolve conflicts
    // For now, return a suggestion
    return {
      success: true,
      newStartTime,
      newDuration: newDuration || 60,
      message: 'Conflict resolved by adjusting timing'
    }
  }

  return {
    conflicts,
    hasConflicts,
    getConflictForStop,
    isStopConflicting,
    resolveConflict,
    conflictCount: conflicts.length
  }
}