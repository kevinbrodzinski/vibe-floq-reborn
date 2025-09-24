import { timeToMinutes, formatTimeFromMinutes } from '@/lib/time-ai'

export interface SmartTimeSuggestionInput {
  planStartTime: string
  planEndTime: string
  existingStops: Array<{
    start_time: string
    end_time: string
    duration_minutes: number
  }>
  venueMetadata?: {
    open_hours?: string[]
    ideal_times?: string[]
    type?: string
  }
  userPreferences?: {
    preferred_vibe?: string
    favorite_time_blocks?: string[]
  }
}

export function getSmartTimeSuggestion({
  planStartTime,
  planEndTime,
  existingStops,
  venueMetadata,
  userPreferences,
}: SmartTimeSuggestionInput): string {
  const startMinutes = timeToMinutes(planStartTime)
  const endMinutes = timeToMinutes(planEndTime)
  
  // Generate 30-minute time slots
  const availableSlots: number[] = []
  for (let time = startMinutes; time <= endMinutes; time += 30) {
    availableSlots.push(time)
  }
  
  // Remove conflicting slots
  const nonConflictingSlots = availableSlots.filter(slot => {
    return !existingStops.some(stop => {
      const stopStart = timeToMinutes(stop.start_time)
      const stopEnd = timeToMinutes(stop.end_time)
      return slot >= stopStart && slot < stopEnd
    })
  })
  
  if (nonConflictingSlots.length === 0) {
    return formatTimeFromMinutes(startMinutes)
  }
  
  // Score slots based on venue metadata and user preferences
  const scoredSlots = nonConflictingSlots.map(slot => {
    let score = 1.0
    
    // Venue open hours boost
    if (venueMetadata?.open_hours) {
      const timeString = formatTimeFromMinutes(slot)
      const isOpenTime = venueMetadata.open_hours.some(hours => {
        const [open, close] = hours.split('-')
        return timeString >= open && timeString <= close
      })
      if (isOpenTime) score += 0.3
    }
    
    // Venue ideal times boost
    if (venueMetadata?.ideal_times) {
      const timeString = formatTimeFromMinutes(slot)
      const isIdealTime = venueMetadata.ideal_times.includes(timeString)
      if (isIdealTime) score += 0.5
    }
    
    // User preference boost
    if (userPreferences?.favorite_time_blocks) {
      const timeString = formatTimeFromMinutes(slot)
      const isFavoriteTime = userPreferences.favorite_time_blocks.includes(timeString)
      if (isFavoriteTime) score += 0.2
    }
    
    return { slot, score }
  })
  
  // Return highest scoring slot
  const bestSlot = scoredSlots.reduce((best, current) => 
    current.score > best.score ? current : best
  )
  
  return formatTimeFromMinutes(bestSlot.slot)
}