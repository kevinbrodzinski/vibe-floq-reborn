import { timeToMinutes, formatTimeFromMinutes } from '@/lib/time'
import type { PlanStop } from '@/types/plan'

export interface SnapToSuggestedInput {
  desiredStart: string
  durationMinutes: number
  planStart: string
  planEnd: string
  existingStops: PlanStop[]
  venueMetadata?: {
    type: string
    ideal_duration?: number
    peak_hours?: string[]
    opening_hours?: {
      open: string
      close: string
    }
  }
  allowOverride?: boolean
}

export interface TimeSlotSuggestion {
  startTime: string
  endTime: string
  confidence: number
  reason: string
  adjustedDuration?: number
}

export function snapToSuggestedTime({
  desiredStart,
  durationMinutes,
  planStart,
  planEnd,
  existingStops,
  venueMetadata,
  allowOverride = false
}: SnapToSuggestedInput): TimeSlotSuggestion {
  const desiredStartMinutes = timeToMinutes(desiredStart)
  const planStartMinutes = timeToMinutes(planStart)
  const planEndMinutes = timeToMinutes(planEnd)

  // If manual override is enabled, just snap to 15-minute intervals
  if (allowOverride) {
    const snappedStart = Math.round(desiredStartMinutes / 15) * 15
    return {
      startTime: formatTimeFromMinutes(snappedStart),
      endTime: formatTimeFromMinutes(snappedStart + durationMinutes),
      confidence: 0.5,
      reason: 'Manual override - snapped to 15-minute interval'
    }
  }

  // Enhanced duration based on venue type
  let suggestedDuration = durationMinutes
  if (venueMetadata?.ideal_duration) {
    suggestedDuration = venueMetadata.ideal_duration
  } else if (venueMetadata?.type) {
    const typeDurations: Record<string, number> = {
      restaurant: 90,
      cafe: 45,
      bar: 75,
      club: 120,
      gallery: 60,
      museum: 90,
      shopping: 60,
      park: 120,
      activity: 180
    }
    suggestedDuration = typeDurations[venueMetadata.type] || durationMinutes
  }

  // Find optimal time slot
  const candidates = generateTimeSlotCandidates(
    desiredStartMinutes,
    suggestedDuration,
    planStartMinutes,
    planEndMinutes,
    existingStops,
    venueMetadata
  )

  // Score and rank candidates
  const scoredCandidates = candidates.map(candidate => ({
    ...candidate,
    score: scoreTimeSlot(candidate, desiredStartMinutes, existingStops, venueMetadata)
  }))

  // Return best candidate
  const bestCandidate = scoredCandidates.sort((a, b) => b.score - a.score)[0]
  
  if (!bestCandidate) {
    // Fallback: just snap to nearest 15-minute interval
    const snappedStart = Math.round(desiredStartMinutes / 15) * 15
    return {
      startTime: formatTimeFromMinutes(snappedStart),
      endTime: formatTimeFromMinutes(snappedStart + durationMinutes),
      confidence: 0.3,
      reason: 'Fallback - no optimal slot found'
    }
  }

  return {
    startTime: formatTimeFromMinutes(bestCandidate.startMinutes),
    endTime: formatTimeFromMinutes(bestCandidate.startMinutes + bestCandidate.duration),
    confidence: bestCandidate.score,
    reason: bestCandidate.reason,
    adjustedDuration: bestCandidate.duration !== durationMinutes ? bestCandidate.duration : undefined
  }
}

function generateTimeSlotCandidates(
  desiredStart: number,
  duration: number,
  planStart: number,
  planEnd: number,
  existingStops: PlanStop[],
  venueMetadata?: any
): Array<{ startMinutes: number; duration: number; reason: string }> {
  const candidates = []

  // Snap to 15-minute intervals around desired time
  for (let offset = -60; offset <= 60; offset += 15) {
    const candidateStart = Math.round((desiredStart + offset) / 15) * 15
    
    if (candidateStart >= planStart && candidateStart + duration <= planEnd) {
      candidates.push({
        startMinutes: candidateStart,
        duration,
        reason: offset === 0 ? 'Exact desired time' : `${Math.abs(offset)} minutes ${offset > 0 ? 'later' : 'earlier'}`
      })
    }
  }

  // Add venue-specific peak times
  if (venueMetadata?.peak_hours) {
    venueMetadata.peak_hours.forEach((peakTime: string) => {
      const peakMinutes = timeToMinutes(peakTime)
      if (peakMinutes >= planStart && peakMinutes + duration <= planEnd) {
        candidates.push({
          startMinutes: peakMinutes,
          duration,
          reason: `Peak time for ${venueMetadata.type}`
        })
      }
    })
  }

  // Add gap-filling suggestions
  const sortedStops = [...existingStops].sort((a, b) => 
    timeToMinutes(a.start_time || '') - timeToMinutes(b.start_time || '')
  )

  for (let i = 0; i < sortedStops.length - 1; i++) {
    const currentStop = sortedStops[i]
    const nextStop = sortedStops[i + 1]
    
    const currentEnd = timeToMinutes(currentStop.end_time || '') || 
                      timeToMinutes(currentStop.start_time || '') + (currentStop.duration_minutes || 60)
    const nextStart = timeToMinutes(nextStop.start_time || '')
    
    const gapSize = nextStart - currentEnd
    if (gapSize >= duration + 30) { // Need at least 30 min buffer
      const gapStart = currentEnd + 15 // 15 min buffer
      candidates.push({
        startMinutes: gapStart,
        duration,
        reason: 'Fills gap between existing stops'
      })
    }
  }

  return candidates
}

function scoreTimeSlot(
  candidate: { startMinutes: number; duration: number; reason: string },
  desiredStart: number,
  existingStops: PlanStop[],
  venueMetadata?: any
): number {
  let score = 1.0

  // Proximity to desired time (higher score for closer times)
  const timeDiff = Math.abs(candidate.startMinutes - desiredStart)
  score -= timeDiff / 120 // Penalize by 1 point per 2 hours

  // Check for conflicts
  const hasConflict = existingStops.some(stop => {
    const stopStart = timeToMinutes(stop.start_time || '')
    const stopEnd = stopStart + (stop.duration_minutes || 60)
    const candidateEnd = candidate.startMinutes + candidate.duration
    
    return candidate.startMinutes < stopEnd && candidateEnd > stopStart
  })

  if (hasConflict) {
    score -= 0.8 // Heavy penalty for conflicts
  }

  // Venue-specific scoring
  if (venueMetadata) {
    const hour = Math.floor(candidate.startMinutes / 60)
    
    // Peak hours boost
    if (venueMetadata.peak_hours?.some((peak: string) => {
      const peakHour = Math.floor(timeToMinutes(peak) / 60)
      return Math.abs(hour - peakHour) <= 1
    })) {
      score += 0.3
    }

    // Opening hours check
    if (venueMetadata.opening_hours) {
      const openHour = Math.floor(timeToMinutes(venueMetadata.opening_hours.open) / 60)
      const closeHour = Math.floor(timeToMinutes(venueMetadata.opening_hours.close) / 60)
      
      if (hour < openHour || hour > closeHour) {
        score -= 0.5 // Penalty for being outside opening hours
      }
    }
  }

  // Bonus for optimal spacing (15-30 minute gaps)
  const nearbyStops = existingStops.filter(stop => {
    const stopStart = timeToMinutes(stop.start_time || '')
    return Math.abs(stopStart - candidate.startMinutes) <= 120 // Within 2 hours
  })

  nearbyStops.forEach(stop => {
    const stopStart = timeToMinutes(stop.start_time || '')
    const gap = Math.abs(stopStart - (candidate.startMinutes + candidate.duration))
    
    if (gap >= 15 && gap <= 30) {
      score += 0.1 // Bonus for optimal gap
    } else if (gap < 15) {
      score -= 0.2 // Penalty for too tight
    }
  })

  return Math.max(0, Math.min(1, score))
}