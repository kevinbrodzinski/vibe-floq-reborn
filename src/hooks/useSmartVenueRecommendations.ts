import { useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getVenuesWithIntelligence, type VenueIntel } from '@/lib/venues/getVenuesWithIntelligence'
import { usePlanParticipants } from '@/hooks/usePlanParticipants'
import { addMinutes, parseISO, format } from 'date-fns'

export interface SmartVenueRecommendation {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  categories: string[]
  cuisines?: string[]
  vibe: string
  vibe_score: number
  popularity: number
  popularity_hourly?: number[]
  live_count: number
  price_tier: string
  price_level?: number
  rating?: number
  rating_count?: number
  photo_url?: string
  hours?: any
  tags?: string[]
  canonical_tags?: string[]
  
  // Recommendation-specific data
  match_score: number
  match_reasons: RecommendationReason[]
  optimal_time_slots: TimeSlotSuggestion[]
  group_suitability: number
  budget_match: number
  distance_meters?: number
  travel_minutes?: number
  availability_windows: AvailabilityWindow[]
  participant_preferences_match: number
  crowd_prediction: CrowdPrediction
  price_prediction: PricePrediction
}

export interface RecommendationReason {
  type: 'vibe_match' | 'cuisine_match' | 'group_size' | 'budget' | 'popularity' | 'distance' | 'availability' | 'participant_preference' | 'crowd_optimal' | 'price_optimal'
  confidence: number
  description: string
  weight: number
}

export interface TimeSlotSuggestion {
  start_time: string
  end_time: string
  confidence: number
  crowd_level: 'low' | 'medium' | 'high'
  price_level: 'low' | 'medium' | 'high'
  optimal_for: string[]
}

export interface AvailabilityWindow {
  start_time: string
  end_time: string
  capacity_available: number
  booking_recommended: boolean
}

export interface CrowdPrediction {
  current_level: 'low' | 'medium' | 'high'
  peak_hours: string[]
  quiet_hours: string[]
  optimal_visit_time: string
}

export interface PricePrediction {
  current_tier: string
  happy_hour_times?: string[]
  peak_pricing_times?: string[]
  special_offers?: string[]
}

interface UseSmartVenueRecommendationsOptions {
  planId: string
  centerLocation: { lat: number; lng: number }
  timeWindow: { start: string; end: string }
  planDate: string
  maxDistance?: number
  limitResults?: number
  preferences?: {
    vibes?: string[]
    cuisines?: string[]
    priceRange?: [number, number]
    categories?: string[]
    crowdPreference?: 'avoid' | 'neutral' | 'seek'
    requiresBooking?: boolean
  }
}

export function useSmartVenueRecommendations({
  planId,
  centerLocation,
  timeWindow,
  planDate,
  maxDistance = 5000,
  limitResults = 20,
  preferences = {}
}: UseSmartVenueRecommendationsOptions) {
  
  const { data: participants = [] } = usePlanParticipants(planId)
  const queryClient = useQueryClient()

  // Analyze participant preferences
  const participantInsights = useMemo(() => {
    const groupSize = participants.filter(p => p.rsvp_status === 'accepted').length || participants.length
    const hasGuests = participants.some(p => p.is_guest)
    const isLargeGroup = groupSize >= 6
    const isIntimateGroup = groupSize <= 3
    
    return {
      groupSize,
      hasGuests,
      isLargeGroup,
      isIntimateGroup,
      avgBudgetTier: 'medium', // Could be calculated from participant profiles
      preferredVibes: preferences.vibes || ['chill', 'energetic'],
      dietaryRestrictions: [], // Could be extracted from participant profiles
      accessibilityNeeds: false // Could be extracted from participant profiles
    }
  }, [participants, preferences])

  // Fetch smart venue recommendations
  const { data: recommendations = [], isLoading, error } = useQuery({
    queryKey: [
      'smart-venue-recommendations',
      planId,
      centerLocation,
      timeWindow,
      planDate,
      maxDistance,
      participantInsights.groupSize,
      JSON.stringify(preferences)
    ],
    queryFn: async (): Promise<SmartVenueRecommendation[]> => {
      try {
        const venues = await getVenuesWithIntelligence({
          lat: centerLocation.lat,
          lng: centerLocation.lng,
          radius_m: maxDistance,
          limit: limitResults * 2, // Get more to allow for filtering
        })

        if (!venues || (venues as any)?.length === 0) {
          return []
        }

        // Process venues into smart recommendations
        const processedRecommendations = (venues as any)?.map((venue: any) => 
          processVenueRecommendation(venue, {
            participantInsights,
            timeWindow,
            planDate,
            centerLocation,
            preferences
          })
        )

        // Sort by match score and return top results
        return processedRecommendations
          .sort((a, b) => b.match_score - a.match_score)
          .slice(0, limitResults)

      } catch (error) {
        console.error('Error fetching smart venue recommendations:', error)
        return []
      }
    },
    enabled: !!centerLocation && !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    throwOnError: false,
    retry: 2
  })

  // Get recommendations by category
  const getRecommendationsByCategory = useCallback((category: string) => {
    return (recommendations as any)?.filter((rec: any) => 
      rec.categories.some((cat: any) => 
        cat.toLowerCase().includes(category.toLowerCase())
      )
    ) || []
  }, [recommendations])

  // Get recommendations by vibe
  const getRecommendationsByVibe = useCallback((vibe: string) => {
    return (recommendations as any)?.filter((rec: any) => 
      rec.vibe.toLowerCase() === vibe.toLowerCase()
    ) || []
  }, [recommendations])

  // Get recommendations for specific time slot
  const getRecommendationsForTimeSlot = useCallback((timeSlot: string) => {
    return (recommendations as any)?.filter((rec: any) =>
      rec.optimal_time_slots.some((slot: any) => {
        const slotStart = parseISO(`${planDate}T${slot.start_time}`)
        const slotEnd = parseISO(`${planDate}T${slot.end_time}`)
        const targetTime = parseISO(`${planDate}T${timeSlot}`)
        
        return targetTime >= slotStart && targetTime <= slotEnd
      })
    ) || []
  }, [recommendations, planDate])

  // Get top recommendations by criteria
  const getTopRecommendations = useCallback((criteria: 'match_score' | 'popularity' | 'rating' | 'distance', limit = 5) => {
    const sorted = [...(recommendations as any || [])].sort((a: any, b: any) => {
      switch (criteria) {
        case 'match_score':
          return b.match_score - a.match_score
        case 'popularity':
          return b.popularity - a.popularity
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'distance':
          return (a.distance_meters || 0) - (b.distance_meters || 0)
        default:
          return 0
      }
    })
    return sorted.slice(0, limit)
  }, [recommendations])

  return {
    recommendations,
    isLoading,
    error,
    participantInsights,
    getRecommendationsByCategory,
    getRecommendationsByVibe,
    getRecommendationsForTimeSlot,
    getTopRecommendations
  }
}

// Helper function to process venue data into smart recommendations
function processVenueRecommendation(
  venue: any,
  context: {
    participantInsights: any
    timeWindow: { start: string; end: string }
    planDate: string
    centerLocation: { lat: number; lng: number }
    preferences: any
  }
): SmartVenueRecommendation {
  const { participantInsights, timeWindow, planDate, centerLocation, preferences } = context
  
  // Calculate match score
  const matchReasons: RecommendationReason[] = []
  let totalScore = 0

  // Vibe matching (20% weight)
  const vibeMatch = calculateVibeMatch(venue, preferences.vibes || [])
  if (vibeMatch.score > 0) {
    matchReasons.push({
      type: 'vibe_match',
      confidence: vibeMatch.score,
      description: vibeMatch.description,
      weight: 0.2
    })
    totalScore += vibeMatch.score * 0.2
  }

  // Group size suitability (15% weight)
  const groupSuitability = calculateGroupSuitability(venue, participantInsights.groupSize)
  if (groupSuitability.score > 0) {
    matchReasons.push({
      type: 'group_size',
      confidence: groupSuitability.score,
      description: groupSuitability.description,
      weight: 0.15
    })
    totalScore += groupSuitability.score * 0.15
  }

  // Budget matching (15% weight)
  const budgetMatch = calculateBudgetMatch(venue, preferences.priceRange)
  if (budgetMatch.score > 0) {
    matchReasons.push({
      type: 'budget',
      confidence: budgetMatch.score,
      description: budgetMatch.description,
      weight: 0.15
    })
    totalScore += budgetMatch.score * 0.15
  }

  // Popularity/quality (15% weight)
  const popularityScore = Math.min(100, (venue.popularity || 0) + (venue.rating || 0) * 20)
  if (popularityScore > 0) {
    matchReasons.push({
      type: 'popularity',
      confidence: popularityScore,
      description: `High quality venue (${venue.rating?.toFixed(1)} stars, ${venue.popularity} popularity)`,
      weight: 0.15
    })
    totalScore += popularityScore * 0.15
  }

  // Distance convenience (10% weight)
  const distance = calculateDistance(centerLocation, { lat: venue.lat, lng: venue.lng })
  const distanceScore = Math.max(0, 100 - (distance / 50)) // 100% at 0m, 0% at 5000m
  if (distanceScore > 0) {
    matchReasons.push({
      type: 'distance',
      confidence: distanceScore,
      description: `${Math.round(distance)}m away - ${getDistanceDescription(distance)}`,
      weight: 0.1
    })
    totalScore += distanceScore * 0.1
  }

  // Availability during time window (15% weight)
  const availabilityScore = calculateAvailabilityScore(venue, timeWindow, planDate)
  if (availabilityScore.score > 0) {
    matchReasons.push({
      type: 'availability',
      confidence: availabilityScore.score,
      description: availabilityScore.description,
      weight: 0.15
    })
    totalScore += availabilityScore.score * 0.15
  }

  // Crowd optimization (10% weight)
  const crowdOptimization = calculateCrowdOptimization(venue, preferences.crowdPreference, timeWindow)
  if (crowdOptimization.score > 0) {
    matchReasons.push({
      type: 'crowd_optimal',
      confidence: crowdOptimization.score,
      description: crowdOptimization.description,
      weight: 0.1
    })
    totalScore += crowdOptimization.score * 0.1
  }

  // Generate time slot suggestions
  const timeSlotSuggestions = generateTimeSlotSuggestions(venue, timeWindow, planDate)
  
  // Generate availability windows
  const availabilityWindows = generateAvailabilityWindows(venue, timeWindow, planDate)
  
  // Generate crowd and price predictions
  const crowdPrediction = generateCrowdPrediction(venue, planDate)
  const pricePrediction = generatePricePrediction(venue, planDate)

  return {
    ...venue,
    match_score: Math.round(totalScore),
    match_reasons: matchReasons,
    optimal_time_slots: timeSlotSuggestions,
    group_suitability: groupSuitability.score,
    budget_match: budgetMatch.score,
    distance_meters: Math.round(distance),
    travel_minutes: Math.round(distance / 83.33), // Assuming 5km/h walking speed
    availability_windows: availabilityWindows,
    participant_preferences_match: vibeMatch.score,
    crowd_prediction: crowdPrediction,
    price_prediction: pricePrediction
  }
}

// Helper functions for scoring
function calculateVibeMatch(venue: any, preferredVibes: string[]) {
  if (!preferredVibes.length) return { score: 50, description: 'No vibe preference specified' }
  
  const venueVibe = venue.vibe?.toLowerCase()
  const match = preferredVibes.some(vibe => vibe.toLowerCase() === venueVibe)
  
  if (match) {
    return {
      score: Math.min(100, venue.vibe_score || 75),
      description: `Perfect vibe match: ${venue.vibe}`
    }
  }
  
  // Partial match based on vibe compatibility
  const vibeCompatibility = getVibeCompatibility(venueVibe, preferredVibes)
  return {
    score: vibeCompatibility * 0.7,
    description: `Compatible vibe: ${venue.vibe}`
  }
}

function calculateGroupSuitability(venue: any, groupSize: number) {
  let score = 50 // Base score
  let description = 'Suitable for groups'
  
  // Adjust based on venue type and group size
  if (groupSize <= 2) {
    if (venue.categories?.includes('cafe') || venue.categories?.includes('restaurant')) {
      score = 90
      description = 'Perfect for intimate dining'
    }
  } else if (groupSize >= 6) {
    if (venue.categories?.includes('bar') || venue.categories?.includes('restaurant')) {
      score = 85
      description = 'Great for larger groups'
    }
    if (venue.tags?.includes('group_friendly') || venue.tags?.includes('large_tables')) {
      score = 95
      description = 'Excellent for large groups'
    }
  }
  
  return { score, description }
}

function calculateBudgetMatch(venue: any, priceRange?: [number, number]) {
  if (!priceRange) return { score: 50, description: 'No budget preference specified' }
  
  const venuePriceLevel = venue.price_level || getPriceLevelFromTier(venue.price_tier)
  const [minBudget, maxBudget] = priceRange
  
  if (venuePriceLevel >= minBudget && venuePriceLevel <= maxBudget) {
    return {
      score: 90,
      description: `Perfect budget match (${venue.price_tier})`
    }
  }
  
  // Partial match
  const distance = Math.min(Math.abs(venuePriceLevel - minBudget), Math.abs(venuePriceLevel - maxBudget))
  const score = Math.max(0, 90 - (distance * 30))
  
  return {
    score,
    description: `${score > 60 ? 'Good' : 'Fair'} budget match (${venue.price_tier})`
  }
}

function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = point1.lat * Math.PI / 180
  const φ2 = point2.lat * Math.PI / 180
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

function calculateAvailabilityScore(venue: any, timeWindow: { start: string; end: string }, planDate: string) {
  if (!venue.hours) {
    return { score: 50, description: 'Hours not specified' }
  }

  const dayOfWeek = new Date(planDate).getDay()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayHours = venue.hours[dayNames[dayOfWeek]]

  if (!dayHours || dayHours.closed) {
    return { score: 0, description: 'Closed on this day' }
  }

  // Check if venue is open during the time window
  const startMinutes = timeToMinutes(timeWindow.start)
  const endMinutes = timeToMinutes(timeWindow.end)

  let isOpenDuringWindow = false
  if (dayHours.periods) {
    isOpenDuringWindow = dayHours.periods.some((period: any) => {
      const openMinutes = period.open.hour * 60 + period.open.minute
      const closeMinutes = period.close.hour * 60 + period.close.minute
      return openMinutes <= startMinutes && closeMinutes >= endMinutes
    })
  }

  if (isOpenDuringWindow) {
    return { score: 95, description: 'Open during your entire time window' }
  }

  return { score: 25, description: 'Limited availability during your time window' }
}

function calculateCrowdOptimization(venue: any, crowdPreference?: string, timeWindow?: { start: string; end: string }) {
  if (!crowdPreference || !venue.popularity_hourly) {
    return { score: 50, description: 'No crowd preference specified' }
  }

  const startHour = parseInt(timeWindow?.start.split(':')[0] || '12')
  const expectedCrowd = venue.popularity_hourly[startHour] || venue.popularity || 50

  const crowdLevel = expectedCrowd < 30 ? 'low' : expectedCrowd < 70 ? 'medium' : 'high'

  if (crowdPreference === 'avoid' && crowdLevel === 'low') {
    return { score: 90, description: 'Low crowd time - perfect for intimate gathering' }
  } else if (crowdPreference === 'seek' && crowdLevel === 'high') {
    return { score: 85, description: 'Peak energy time - great for social experience' }
  } else if (crowdPreference === 'neutral') {
    return { score: 75, description: 'Moderate crowd levels expected' }
  }

  return { score: 40, description: `${crowdLevel} crowd expected` }
}

// Additional helper functions
function getVibeCompatibility(venueVibe: string, preferredVibes: string[]): number {
  const compatibility: Record<string, string[]> = {
    'chill': ['cozy', 'romantic'],
    'energetic': ['wild', 'lively'],
    'romantic': ['cozy', 'intimate'],
    'wild': ['energetic', 'lively'],
    'cozy': ['chill', 'romantic']
  }

  const compatibleVibes = compatibility[venueVibe] || []
  const hasCompatible = preferredVibes.some(vibe => compatibleVibes.includes(vibe.toLowerCase()))
  
  return hasCompatible ? 60 : 30
}

function getPriceLevelFromTier(tier: string): number {
  const tierMap: Record<string, number> = {
    '$': 1,
    '$$': 2,
    '$$$': 3,
    '$$$$': 4
  }
  return tierMap[tier] || 2
}

function getDistanceDescription(distance: number): string {
  if (distance < 100) return 'Very close'
  if (distance < 500) return 'Short walk'
  if (distance < 1000) return 'Easy walk'
  if (distance < 2000) return 'Moderate walk'
  return 'Longer walk'
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function generateTimeSlotSuggestions(venue: any, timeWindow: { start: string; end: string }, planDate: string): TimeSlotSuggestion[] {
  const suggestions: TimeSlotSuggestion[] = []
  const startHour = parseInt(timeWindow.start.split(':')[0])
  const endHour = parseInt(timeWindow.end.split(':')[0])

  for (let hour = startHour; hour <= endHour; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`
    const endTimeStr = `${(hour + 2).toString().padStart(2, '0')}:00`
    
    const crowdLevel = venue.popularity_hourly?.[hour] || 50
    const crowdLevelStr = crowdLevel < 30 ? 'low' : crowdLevel < 70 ? 'medium' : 'high'
    
    suggestions.push({
      start_time: timeStr,
      end_time: endTimeStr,
      confidence: Math.max(60, 100 - Math.abs(crowdLevel - 50)),
      crowd_level: crowdLevelStr as 'low' | 'medium' | 'high',
      price_level: 'medium' as 'low' | 'medium' | 'high',
      optimal_for: getOptimalActivities(venue, hour)
    })
  }

  return suggestions.slice(0, 3) // Return top 3 suggestions
}

function generateAvailabilityWindows(venue: any, timeWindow: { start: string; end: string }, planDate: string): AvailabilityWindow[] {
  // Simplified availability - in a real app, this would integrate with booking systems
  return [{
    start_time: timeWindow.start,
    end_time: timeWindow.end,
    capacity_available: 80,
    booking_recommended: venue.categories?.includes('restaurant') || false
  }]
}

function generateCrowdPrediction(venue: any, planDate: string): CrowdPrediction {
  const popularityHourly = venue.popularity_hourly || Array(24).fill(venue.popularity || 50)
  
  const peakHours = popularityHourly
    .map((pop, hour) => ({ hour, pop }))
    .filter(({ pop }) => pop > 70)
    .map(({ hour }) => `${hour}:00`)

  const quietHours = popularityHourly
    .map((pop, hour) => ({ hour, pop }))
    .filter(({ pop }) => pop < 30)
    .map(({ hour }) => `${hour}:00`)

  const optimalHour = popularityHourly.indexOf(Math.min(...popularityHourly.slice(8, 22)))

  return {
    current_level: venue.live_count < 10 ? 'low' : venue.live_count < 30 ? 'medium' : 'high',
    peak_hours: peakHours.slice(0, 3),
    quiet_hours: quietHours.slice(0, 3),
    optimal_visit_time: `${optimalHour}:00`
  }
}

function generatePricePrediction(venue: any, planDate: string): PricePrediction {
  return {
    current_tier: venue.price_tier || '$$',
    happy_hour_times: ['15:00-18:00', '21:00-23:00'],
    peak_pricing_times: ['19:00-21:00'],
    special_offers: []
  }
}

function getOptimalActivities(venue: any, hour: number): string[] {
  const activities: string[] = []
  
  if (hour >= 6 && hour < 11 && venue.categories?.includes('cafe')) {
    activities.push('breakfast', 'coffee')
  } else if (hour >= 11 && hour < 15 && venue.categories?.includes('restaurant')) {
    activities.push('lunch', 'business_meeting')
  } else if (hour >= 17 && hour < 22 && venue.categories?.includes('restaurant')) {
    activities.push('dinner', 'date_night')
  } else if (hour >= 20 && venue.categories?.includes('bar')) {
    activities.push('drinks', 'nightlife')
  }
  
  return activities
}