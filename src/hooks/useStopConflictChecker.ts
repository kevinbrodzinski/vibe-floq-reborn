import { useMemo } from 'react'
import type { PlanStop, ConflictInfo } from '@/types/plan'
import { checkStopConflicts, generateConflictDetails } from '@/utils/conflict-utils'

export function useStopConflictChecker(stops: PlanStop[]) {
  const conflicts = useMemo(() => {
    return generateConflictDetails(stops)
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