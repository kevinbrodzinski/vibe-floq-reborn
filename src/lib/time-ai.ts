import type { PlanStop, TimeSlotSuggestion, NovaTimeSuggestion } from '@/types/plan'
import { calculateEnhancedConfidence } from './suggestions'

// Venue-specific default durations
export const defaultDurations: Record<string, number> = {
  restaurant: 90,
  bar: 120,
  cafe: 60,
  museum: 180,
  park: 120,
  shopping: 90,
  entertainment: 150,
  default: 90
}

// Generate time slot candidates for AI suggestions
export function generateTimeSlotCandidates(
  existingStops: PlanStop[],
  startTime: string = '18:00',
  endTime: string = '23:00'
): TimeSlotSuggestion[] {
  const candidates: TimeSlotSuggestion[] = []
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  
  // Create 15-minute slots
  for (let time = startMinutes; time <= endMinutes - 60; time += 15) {
    const slotStart = formatTimeFromMinutes(time)
    const slotEnd = formatTimeFromMinutes(time + 90) // Default 90min duration
    
    const confidence = scoreTimeSlot(slotStart, slotEnd, existingStops)
    if (confidence > 0.3) { // Only include viable slots
      candidates.push({
        startTime: slotStart,
        endTime: slotEnd,
        confidence,
        reason: generateSlotReason(confidence, existingStops.length)
      })
    }
  }
  
  return candidates.sort((a, b) => b.confidence - a.confidence)
}

// Score a time slot based on conflicts and spacing
export function scoreTimeSlot(
  startTime: string,
  endTime: string,
  existingStops: PlanStop[]
): number {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  
  let score = 1.0
  
  // Check for overlaps
  for (const stop of existingStops) {
    const stopStart = timeToMinutes(stop.start_time || stop.startTime)
    const stopEnd = timeToMinutes(stop.end_time || stop.endTime)
    
    if (startMinutes < stopEnd && endMinutes > stopStart) {
      return 0 // Complete overlap = invalid
    }
    
    // Penalty for being too close
    const beforeGap = Math.abs(startMinutes - stopEnd)
    const afterGap = Math.abs(stopStart - endMinutes)
    const minGap = Math.min(beforeGap, afterGap)
    
    if (minGap < 30) { // Less than 30min gap
      score *= 0.7
    } else if (minGap > 180) { // More than 3hr gap
      score *= 0.8
    }
  }
  
  return Math.max(0, Math.min(1, score))
}

// Generate reasoning for time slot suggestions
function generateSlotReason(confidence: number, stopCount: number): string {
  if (confidence > 0.8) {
    return stopCount === 0 ? 'Perfect starting time' : 'Ideal spacing with other stops'
  } else if (confidence > 0.6) {
    return 'Good timing with minor adjustments needed'
  } else if (confidence > 0.4) {
    return 'Workable slot but may feel rushed'
  }
  return 'Tight timing - consider adjusting'
}

// Enhanced suggestion generator with venue metadata
export function generateTimeSuggestions(
  stops: PlanStop[],
  targetDuration: number = 90,
  venueType?: string
): NovaTimeSuggestion[] {
  const suggestions: NovaTimeSuggestion[] = []
  const duration = venueType ? (defaultDurations[venueType] || targetDuration) : targetDuration
  
  // Find gaps in the timeline
  const sortedStops = [...stops].sort((a, b) => 
    timeToMinutes(a.start_time || a.startTime) - timeToMinutes(b.start_time || b.startTime)
  )
  
  // Generate suggestions for gaps between stops
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const currentEnd = timeToMinutes(sortedStops[i].end_time || sortedStops[i].endTime)
    const nextStart = timeToMinutes(sortedStops[i + 1].start_time || sortedStops[i + 1].startTime)
    const gap = nextStart - currentEnd
    
    if (gap >= duration + 30) { // At least 30min buffer
      const suggestedStart = currentEnd + 15 // 15min buffer
      const suggestedEnd = suggestedStart + duration
      
      if (suggestedEnd + 15 <= nextStart) {
        suggestions.push({
          id: `gap-${i}`,
          startTime: formatTimeFromMinutes(suggestedStart),
          endTime: formatTimeFromMinutes(suggestedEnd),
          confidence: calculateEnhancedConfidence(suggestedStart, sortedStops, venueType),
          reasoning: [
            `Fits perfectly between ${sortedStops[i].title} and ${sortedStops[i + 1].title}`,
            `${Math.floor(gap / 60)}h gap allows comfortable timing`,
            venueType ? `Optimized for ${venueType} duration` : 'Standard duration applied'
          ],
          venueMetadata: venueType ? {
            type: venueType,
            peakHours: getVenuePeakHours(venueType),
            averageDuration: defaultDurations[venueType] || 90
          } : undefined,
          spacing: {
            beforeGap: 15,
            afterGap: nextStart - suggestedEnd,
            idealSpacing: gap > duration + 60
          }
        })
      }
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}


// Get venue-specific peak hours  
export function getVenuePeakHours(venueType: string): string[] {
  const peakHours: Record<string, string[]> = {
    restaurant: ['12:00-14:00', '18:00-21:00'],
    bar: ['17:00-19:00', '21:00-01:00'],
    cafe: ['07:00-10:00', '14:00-17:00'],
    museum: ['10:00-12:00', '14:00-16:00'],
    park: ['10:00-16:00'],
    shopping: ['10:00-12:00', '15:00-18:00'],
    entertainment: ['19:00-23:00']
  }
  
  return peakHours[venueType] || []
}

// Utility functions
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}