import type { PlanStop } from '@/types/plan'
import { timeToMinutes, formatTimeFromMinutes } from '@/lib/time'

export interface TimeSlotSuggestion {
  startTime: string
  endTime: string
  confidence: number
  reason?: string
}

export function snapToSuggestedSlot(
  stop: PlanStop, 
  suggestions: TimeSlotSuggestion[]
): PlanStop {
  if (!suggestions.length) return stop

  const stopStartMinutes = timeToMinutes(stop.start_time || '')
  const bestSuggestion = suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .find(suggestion => {
      const suggestionStart = timeToMinutes(suggestion.startTime)
      return Math.abs(suggestionStart - stopStartMinutes) <= 30 // Within 30 minutes
    })

  if (!bestSuggestion) return stop

  return {
    ...stop,
    start_time: bestSuggestion.startTime,
    end_time: bestSuggestion.endTime,
    duration_minutes: timeToMinutes(bestSuggestion.endTime) - timeToMinutes(bestSuggestion.startTime)
  }
}

export function isOverlapping(stop: PlanStop, otherStops: PlanStop[]): boolean {
  const stopStart = timeToMinutes(stop.start_time || '')
  const stopEnd = timeToMinutes(stop.end_time || '') || stopStart + (stop.duration_minutes || 60)

  return otherStops.some(other => {
    if (other.id === stop.id) return false
    
    const otherStart = timeToMinutes(other.start_time || '')
    const otherEnd = timeToMinutes(other.end_time || '') || otherStart + (other.duration_minutes || 60)
    
    return stopStart < otherEnd && stopEnd > otherStart
  })
}

export function checkStopConflicts(stops: PlanStop[]): string[] {
  const conflictingIds: Set<string> = new Set()

  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const stopA = stops[i]
      const stopB = stops[j]

      if (isOverlapping(stopA, [stopB])) {
        conflictingIds.add(stopA.id)
        conflictingIds.add(stopB.id)
      }
    }
  }

  return Array.from(conflictingIds)
}

export function snapToSuggestion(
  startMinutes: number,
  duration: number,
  venueType: string = 'default'
): { snappedStart: number; snappedEnd: number } {
  // Snap to 15-minute intervals
  const snappedStart = Math.round(startMinutes / 15) * 15
  
  // Adjust duration based on venue type
  const defaultDurations: Record<string, number> = {
    restaurant: 90,
    bar: 60,
    club: 120,
    cafe: 45,
    gallery: 40,
    default: 60
  }
  
  const suggestedDuration = defaultDurations[venueType] || defaultDurations.default
  const finalDuration = duration || suggestedDuration
  
  return {
    snappedStart,
    snappedEnd: snappedStart + finalDuration
  }
}

export function generateTimeSuggestions(
  planId: string,
  stops: PlanStop[],
  venueType?: string
): TimeSlotSuggestion[] {
  // Simple suggestion algorithm - find gaps in timeline
  const suggestions: TimeSlotSuggestion[] = []
  const sortedStops = [...stops].sort((a, b) => 
    timeToMinutes(a.start_time || '') - timeToMinutes(b.start_time || '')
  )

  // Suggest times between existing stops
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const currentStop = sortedStops[i]
    const nextStop = sortedStops[i + 1]
    
    const currentEnd = timeToMinutes(currentStop.end_time || '') || 
                      timeToMinutes(currentStop.start_time || '') + (currentStop.duration_minutes || 60)
    const nextStart = timeToMinutes(nextStop.start_time || '')
    
    const gap = nextStart - currentEnd
    if (gap >= 60) { // At least 1 hour gap
      const suggestedStart = currentEnd + 15 // 15 minute buffer
      suggestions.push({
        startTime: formatTimeFromMinutes(suggestedStart),
        endTime: formatTimeFromMinutes(suggestedStart + 60),
        confidence: 0.8,
        reason: 'Fits between existing stops'
      })
    }
  }

  // Add suggestions at common times if no conflicts
  const commonTimes = ['18:00', '19:30', '21:00', '22:30']
  commonTimes.forEach(time => {
    const minutes = timeToMinutes(time)
    const wouldConflict = stops.some(stop => {
      const stopStart = timeToMinutes(stop.start_time || '')
      const stopEnd = stopStart + (stop.duration_minutes || 60)
      return minutes < stopEnd && minutes + 60 > stopStart
    })
    
    if (!wouldConflict) {
      suggestions.push({
        startTime: time,
        endTime: formatTimeFromMinutes(minutes + 60),
        confidence: 0.6,
        reason: 'Popular time slot'
      })
    }
  })

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}