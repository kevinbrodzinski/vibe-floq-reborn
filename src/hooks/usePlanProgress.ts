import { useMemo } from 'react'
import type { PlanStop } from '@/types/plan'

export interface PlanProgressMetrics {
  totalStops: number
  readyStops: number
  progressPercentage: number
  hasTitle: boolean
  hasDescription: boolean
  hasStops: boolean
  hasTimings: boolean
  isComplete: boolean
}

/**
 * Determines if a stop is "ready" based on required fields
 */
const isStopReady = (stop: PlanStop): boolean => {
  return Boolean(
    stop.title?.trim() &&
    stop.startTime &&
    stop.endTime &&
    (stop.venue || stop.location)
  )
}

/**
 * Calculates plan completion progress and readiness metrics
 */
export function usePlanProgress(
  plan?: { title?: string; description?: string },
  stops: PlanStop[] = []
): PlanProgressMetrics {
  return useMemo(() => {
    const totalStops = stops.length
    const readyStops = stops.filter(isStopReady).length
    
    const hasTitle = Boolean(plan?.title?.trim())
    const hasDescription = Boolean(plan?.description?.trim())
    const hasStops = totalStops > 0
    const hasTimings = stops.every(stop => stop.startTime && stop.endTime)
    
    // Calculate overall progress percentage
    let progressScore = 0
    if (hasTitle) progressScore += 20
    if (hasDescription) progressScore += 10
    if (hasStops) progressScore += 30
    if (hasTimings) progressScore += 20
    if (totalStops > 0) progressScore += (readyStops / totalStops) * 20
    
    const progressPercentage = Math.round(progressScore)
    const isComplete = progressPercentage >= 80 && readyStops >= 2
    
    return {
      totalStops,
      readyStops,
      progressPercentage,
      hasTitle,
      hasDescription,
      hasStops,
      hasTimings,
      isComplete
    }
  }, [plan?.title, plan?.description, stops])
}