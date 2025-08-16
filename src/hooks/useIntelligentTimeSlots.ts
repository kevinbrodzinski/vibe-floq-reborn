import { useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { addMinutes, format, parseISO, isWithinInterval } from 'date-fns'

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  confidence: number
  reasons: SlotReason[]
  suggestedVenues?: VenueSuggestion[]
  travelTimeFromPrevious?: number
  optimalForActivity?: string[]
  crowdLevel?: 'low' | 'medium' | 'high'
  priceOptimal?: boolean
}

interface SlotReason {
  type: 'venue_hours' | 'crowd_optimal' | 'price_optimal' | 'travel_efficient' | 'activity_peak' | 'weather_optimal'
  confidence: number
  description: string
  data?: any
}

interface VenueSuggestion {
  id: string
  name: string
  vibe_score: number
  popularity: number
  price_tier: string
  distance_meters?: number
  travel_minutes?: number
  optimal_time_reason: string
}

interface UseIntelligentTimeSlotsOptions {
  planId: string
  planDate: string
  startTime: string
  endTime: string
  existingStops: Array<{
    id: string
    start_time?: string
    end_time?: string
    venue_id?: string
  }>
  preferences?: {
    budget?: 'low' | 'medium' | 'high'
    vibes?: string[]
    activityTypes?: string[]
    crowdPreference?: 'avoid' | 'neutral' | 'seek'
  }
  groupSize?: number
  centerLocation?: { lat: number; lng: number }
}

export function useIntelligentTimeSlots({
  planId,
  planDate,
  startTime,
  endTime,
  existingStops = [],
  preferences = {},
  groupSize = 2,
  centerLocation
}: UseIntelligentTimeSlotsOptions) {
  
  // Fetch venue data for intelligent recommendations
  const { data: nearbyVenues = [], isLoading, error } = useQuery({
    queryKey: ['nearby-venues', centerLocation, preferences.vibes],
    queryFn: async () => {
      if (!centerLocation) return []
      
      try {
        const { data, error } = await supabase.rpc('get_venues_with_intelligence', {
          center_lat: centerLocation.lat,
          center_lng: centerLocation.lng,
          radius_meters: 5000, // 5km radius
          limit_count: 100,
          vibe_filter: preferences.vibes || null,
          date_context: planDate,
          time_window: { start: startTime, end: endTime }
        })
        
        if (error) {
          console.error('Failed to fetch intelligent venue data:', error)
          throw error
        }
        
        return data || []
      } catch (error) {
        console.error('Error in venue intelligence query:', error)
        // Return empty array instead of throwing to prevent suspension
        return []
      }
    },
    enabled: !!centerLocation,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Prevent suspension during synchronous operations
    suspense: false,
    throwOnError: false
  })

  // Generate intelligent time slots
  const intelligentSlots = useMemo(() => {
    // Return empty array if there's an error or no venues
    if (error || isLoading) return []
    
    const slots: TimeSlot[] = []
    const occupiedTimes = new Set<string>()
    
    // Mark existing stop times as occupied
    existingStops.forEach(stop => {
      if (stop.start_time) {
        const startHour = stop.start_time.split(':')[0]
        occupiedTimes.add(startHour)
      }
    })
    
    // Generate 30-minute slots within the time window
    const start = parseInt(startTime.split(':')[0])
    const end = parseInt(endTime.split(':')[0]) || 24
    
    for (let hour = start; hour < end; hour++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        const slotId = `slot-${hour}-${minutes}`
        
        // Skip if slot is occupied
        if (occupiedTimes.has(hour.toString())) continue
        
        try {
          // Analyze this time slot for optimization opportunities
          const slotAnalysis = analyzeTimeSlot({
            time: timeStr,
            date: planDate,
            venues: nearbyVenues,
            preferences,
            groupSize,
            existingStops
          })
          
          // Only include slots with good confidence scores
          if (slotAnalysis.confidence >= 60) {
            slots.push({
              id: slotId,
              startTime: timeStr,
              endTime: format(addMinutes(parseISO(`${planDate}T${timeStr}`), 90), 'HH:mm'), // Default 90min duration
              ...slotAnalysis
            })
          }
        } catch (slotError) {
          console.error(`Error analyzing time slot ${timeStr}:`, slotError)
          // Skip this slot instead of failing entirely
          continue
        }
      }
    }
    
    // Sort by confidence score
    return slots.sort((a, b) => b.confidence - a.confidence).slice(0, 8) // Top 8 suggestions
  }, [planDate, startTime, endTime, existingStops, nearbyVenues, preferences, groupSize, error, isLoading])

  // Smart venue suggestions for a specific time slot
  const getVenuesForTimeSlot = useCallback((timeSlot: string) => {
    if (error || !nearbyVenues.length) return []
    
    try {
      return nearbyVenues
        .filter(venue => isVenueOpenAt(venue, planDate, timeSlot))
        .map(venue => ({
          ...venue,
          optimal_time_reason: getOptimalTimeReason(venue, timeSlot, preferences)
        }))
        .sort((a, b) => {
          // Sort by vibe match, then popularity, then distance
          const aScore = (a.vibe_score || 50) + (a.popularity || 0) * 0.1
          const bScore = (b.vibe_score || 50) + (b.popularity || 0) * 0.1
          return bScore - aScore
        })
        .slice(0, 5) // Top 5 venues per slot
    } catch (venueError) {
      console.error('Error getting venues for time slot:', venueError)
      return []
    }
  }, [nearbyVenues, planDate, preferences, error])

  // Get smart suggestions for filling empty time slots
  const getSuggestionsForEmptySlots = useCallback(() => {
    if (error) return []
    
    try {
      return intelligentSlots.map(slot => ({
        ...slot,
        suggestedVenues: getVenuesForTimeSlot(slot.startTime)
      }))
    } catch (suggestionError) {
      console.error('Error getting suggestions for empty slots:', suggestionError)
      return []
    }
  }, [intelligentSlots, getVenuesForTimeSlot, error])

  return {
    intelligentSlots,
    getVenuesForTimeSlot,
    getSuggestionsForEmptySlots,
    isLoading: isLoading && !!centerLocation,
    error
  }
}

// Helper function to analyze a time slot for optimization opportunities
function analyzeTimeSlot({
  time,
  date,
  venues,
  preferences,
  groupSize,
  existingStops
}: {
  time: string
  date: string
  venues: any[]
  preferences: any
  groupSize: number
  existingStops: any[]
}): Omit<TimeSlot, 'id' | 'startTime' | 'endTime'> {
  const reasons: SlotReason[] = []
  let confidence = 50 // Base confidence
  
  try {
    const hour = parseInt(time.split(':')[0])
    const timeContext = getTimeContext(hour)
    
    // Analyze venue hours optimization
    const openVenues = venues.filter(v => isVenueOpenAt(v, date, time))
    if (openVenues.length > 0) {
      const avgPopularity = openVenues.reduce((sum, v) => sum + (v.popularity || 0), 0) / openVenues.length
      
      reasons.push({
        type: 'venue_hours',
        confidence: Math.min(95, 60 + (openVenues.length * 2)),
        description: `${openVenues.length} venues open with avg popularity ${avgPopularity.toFixed(0)}`
      })
      confidence += 15
    }
    
    // Analyze crowd patterns
    const crowdAnalysis = analyzeCrowdPatterns(venues, hour, preferences.crowdPreference)
    if (crowdAnalysis.optimal) {
      reasons.push({
        type: 'crowd_optimal',
        confidence: crowdAnalysis.confidence,
        description: crowdAnalysis.description
      })
      confidence += crowdAnalysis.confidence * 0.3
    }
    
    // Analyze price optimization (happy hours, lunch specials, etc.)
    const priceOptimal = analyzePriceOptimization(hour, timeContext, preferences.budget)
    if (priceOptimal.optimal) {
      reasons.push({
        type: 'price_optimal',
        confidence: priceOptimal.confidence,
        description: priceOptimal.description
      })
      confidence += 10
    }
    
    // Analyze activity peak times
    const activityAnalysis = analyzeActivityPeaks(hour, timeContext, preferences.activityTypes)
    if (activityAnalysis.optimal) {
      reasons.push({
        type: 'activity_peak',
        confidence: activityAnalysis.confidence,
        description: activityAnalysis.description
      })
      confidence += 12
    }
    
    return {
      confidence: Math.min(100, Math.max(0, confidence)),
      reasons,
      crowdLevel: crowdAnalysis.level,
      priceOptimal: priceOptimal.optimal,
      optimalForActivity: activityAnalysis.activities
    }
  } catch (error) {
    console.error('Error analyzing time slot:', error)
    // Return minimal analysis instead of throwing
    return {
      confidence: 30,
      reasons: [],
      crowdLevel: 'medium' as const,
      priceOptimal: false,
      optimalForActivity: []
    }
  }
}

// Helper functions
function isVenueOpenAt(venue: any, date: string, time: string): boolean {
  if (!venue.hours) return true // Assume open if no hours data
  
  try {
    const dayOfWeek = new Date(date).getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayHours = venue.hours[dayNames[dayOfWeek]]
    
    if (!dayHours || dayHours.closed) return false
    
    const [hour, minute] = time.split(':').map(Number)
    const timeMinutes = hour * 60 + minute
    
    return dayHours.periods?.some((period: any) => {
      const openMinutes = period.open.hour * 60 + period.open.minute
      const closeMinutes = period.close.hour * 60 + period.close.minute
      return timeMinutes >= openMinutes && timeMinutes <= closeMinutes
    }) || false
  } catch (error) {
    console.error('Error checking venue hours:', error)
    return true // Default to open if parsing fails
  }
}

function getTimeContext(hour: number): 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'late_night' {
  if (hour >= 6 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'dinner'
  return 'late_night'
}

function analyzeCrowdPatterns(venues: any[], hour: number, preference?: 'avoid' | 'neutral' | 'seek') {
  const avgPopularity = venues.reduce((sum, v) => {
    const hourlyPop = v.popularity_hourly?.[hour] || v.popularity || 0
    return sum + hourlyPop
  }, 0) / Math.max(venues.length, 1)
  
  const level: 'low' | 'medium' | 'high' = avgPopularity < 30 ? 'low' : avgPopularity < 70 ? 'medium' : 'high'
  
  let optimal = false
  let confidence = 50
  let description = `Average crowd level: ${level}`
  
  if (preference === 'avoid' && level === 'low') {
    optimal = true
    confidence = 85
    description = 'Low crowd time - perfect for intimate gatherings'
  } else if (preference === 'seek' && level === 'high') {
    optimal = true
    confidence = 80
    description = 'Peak energy time - great for social experiences'
  } else if (preference === 'neutral' || !preference) {
    optimal = level === 'medium'
    confidence = level === 'medium' ? 75 : 60
  }
  
  return { optimal, confidence, description, level }
}

function analyzePriceOptimization(hour: number, context: string, budget?: 'low' | 'medium' | 'high') {
  let optimal = false
  let confidence = 50
  let description = 'Standard pricing'
  
  // Happy hour detection (typically 3-6pm or 9-11pm)
  if ((hour >= 15 && hour < 18) || (hour >= 21 && hour < 23)) {
    optimal = true
    confidence = 80
    description = 'Happy hour pricing available at many venues'
  }
  
  // Lunch specials (11am-3pm)
  if (hour >= 11 && hour < 15 && context === 'lunch') {
    optimal = true
    confidence = 75
    description = 'Lunch special pricing typically available'
  }
  
  // Early bird dinner (5-7pm)
  if (hour >= 17 && hour < 19 && context === 'dinner') {
    optimal = budget === 'low'
    confidence = optimal ? 70 : 60
    description = optimal ? 'Early bird dinner specials' : 'Pre-peak dinner pricing'
  }
  
  return { optimal, confidence, description }
}

function analyzeActivityPeaks(hour: number, context: string, activityTypes?: string[]) {
  const activities: string[] = []
  let optimal = false
  let confidence = 50
  let description = 'Standard activity time'
  
  if (context === 'breakfast' && activityTypes?.includes('cafe')) {
    activities.push('coffee', 'breakfast')
    optimal = true
    confidence = 85
    description = 'Peak breakfast and coffee time'
  }
  
  if (context === 'lunch' && activityTypes?.includes('dining')) {
    activities.push('lunch', 'business_dining')
    optimal = true
    confidence = 80
    description = 'Optimal lunch dining period'
  }
  
  if (context === 'dinner' && (hour >= 18 && hour < 21)) {
    activities.push('dinner', 'fine_dining')
    optimal = true
    confidence = 90
    description = 'Prime dinner time - best service and atmosphere'
  }
  
  if (context === 'late_night' && activityTypes?.includes('nightlife')) {
    activities.push('bars', 'nightlife', 'live_music')
    optimal = true
    confidence = 85
    description = 'Peak nightlife and entertainment time'
  }
  
  return { optimal, confidence, description, activities }
}

function getOptimalTimeReason(venue: any, time: string, preferences: any): string {
  const hour = parseInt(time.split(':')[0])
  const context = getTimeContext(hour)
  
  if (venue.categories?.includes('restaurant')) {
    if (context === 'lunch') return 'Perfect lunch timing'
    if (context === 'dinner') return 'Ideal dinner hour'
  }
  
  if (venue.categories?.includes('bar') && context === 'late_night') {
    return 'Prime bar time'
  }
  
  if (venue.categories?.includes('cafe') && context === 'breakfast') {
    return 'Coffee shop peak hours'
  }
  
  return 'Good timing for this venue type'
}