import { timeToMinutes, formatTimeFromMinutes } from '@/lib/time-ai'
import type { PlanStop, NovaTimeSuggestion } from '@/types/plan'

interface SuggestionConfig {
  bufferMinutes?: number
  gapMinutes?: number
  preferredSpacing?: number
}

export function calculateEnhancedConfidence(
  startTimeMinutes: number, 
  stops: PlanStop[], 
  venueType?: string,
  config: SuggestionConfig = {}
): number {
  const { bufferMinutes = 15, gapMinutes = 30, preferredSpacing = 120 } = config
  
  let confidence = 0.5 // Base confidence
  
  // Time of day bonus (evening hours are generally better)
  if (startTimeMinutes >= 18 * 60 && startTimeMinutes <= 22 * 60) {
    confidence += 0.2
  }
  
  // Venue type bonus
  if (venueType) {
    const venueBonuses: Record<string, number> = {
      'restaurant': 0.15,
      'bar': 0.1,
      'entertainment': 0.1,
      'cultural': 0.05
    }
    confidence += venueBonuses[venueType] || 0
  }
  
  // Spacing from other stops
  const cachedTimes = stops.map(stop => ({
    start: timeToMinutes(stop.start_time || '18:00'),
    end: timeToMinutes(stop.end_time || '19:30')
  }))
  
  for (const stopTime of cachedTimes) {
    const gap = Math.min(
      Math.abs(startTimeMinutes - stopTime.end),
      Math.abs(startTimeMinutes - stopTime.start)
    )
    
    if (gap < bufferMinutes) {
      confidence -= 0.3 // Penalty for being too close
    } else if (gap >= gapMinutes && gap <= preferredSpacing) {
      confidence += 0.1 // Bonus for good spacing
    }
  }
  
  return Math.max(0, Math.min(1, confidence))
}

export function getVenuePeakHours(venueType: string): string[] {
  const peakHours: Record<string, string[]> = {
    'restaurant': ['12:00-14:00', '19:00-21:00'],
    'bar': ['18:00-20:00', '22:00-24:00'],
    'entertainment': ['20:00-22:00'],
    'cultural': ['10:00-12:00', '14:00-16:00'],
    'general': ['18:00-20:00']
  }
  
  return peakHours[venueType] || peakHours.general
}