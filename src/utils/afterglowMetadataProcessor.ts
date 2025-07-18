import { calculateDistance, formatDistance } from './locationHelpers'

// Types for afterglow metadata processing
export interface ProcessedMomentMetadata {
  location?: {
    coordinates?: [number, number]
    venue_name?: string
    venue_id?: string
    address?: string
    distance_from_previous?: number
  }
  people?: {
    encountered_users: Array<{
      user_id: string
      interaction_strength: number
      shared_duration: number
      interaction_type: string
    }>
    total_people_count: number
  }
  social_context?: {
    floq_id?: string
    group_size?: number
    activity_type?: string
  }
  vibe?: string
  intensity?: number
}

export interface RawMomentData {
  timestamp: string
  moment_type: string
  title: string
  description?: string
  color: string
  location_geom?: string // PostGIS geometry
  metadata: Record<string, any>
}

/**
 * Process raw moment data from the database to ensure proper metadata structure
 */
export function processMomentMetadata(moment: RawMomentData): ProcessedMomentMetadata {
  const processed: ProcessedMomentMetadata = {}

  // Process location data
  if (moment.metadata.location || moment.location_geom) {
    processed.location = {
      ...moment.metadata.location,
      // If we have PostGIS geometry, extract coordinates
      // This would be handled by a proper PostGIS to GeoJSON conversion in production
    }
  }

  // Process people data with defaults
  if (moment.metadata.people) {
    processed.people = {
      encountered_users: moment.metadata.people.encountered_users || [],
      total_people_count: moment.metadata.people.total_people_count || 0
    }
  }

  // Process social context
  if (moment.metadata.social_context) {
    processed.social_context = {
      floq_id: moment.metadata.social_context.floq_id,
      group_size: moment.metadata.social_context.group_size,
      activity_type: moment.metadata.social_context.activity_type
    }
  }

  // Process vibe and intensity
  if (moment.metadata.vibe) {
    processed.vibe = moment.metadata.vibe
  }

  if (moment.metadata.intensity !== undefined) {
    processed.intensity = Number(moment.metadata.intensity)
  }

  return processed
}

/**
 * Calculate distances between sequential moments
 */
export function calculateMomentDistances(moments: Array<{ metadata: ProcessedMomentMetadata }>): Array<{ metadata: ProcessedMomentMetadata }> {
  return moments.map((moment, index) => {
    if (index === 0 || !moment.metadata.location?.coordinates) {
      return {
        ...moment,
        metadata: {
          ...moment.metadata,
          location: {
            ...moment.metadata.location,
            distance_from_previous: 0
          }
        }
      }
    }

    const currentCoords = moment.metadata.location.coordinates
    const previousMoment = moments[index - 1]
    
    if (!previousMoment?.metadata?.location?.coordinates) {
      return moment
    }

    const previousCoords = previousMoment.metadata.location.coordinates
    const distance = calculateDistance(previousCoords, currentCoords)

    return {
      ...moment,
      metadata: {
        ...moment.metadata,
        location: {
          ...moment.metadata.location,
          distance_from_previous: Math.round(distance)
        }
      }
    }
  })
}

/**
 * Analyze people encounter patterns across moments
 */
export function analyzePeopleEncounters(moments: Array<{ metadata: ProcessedMomentMetadata }>) {
  const allEncounters = moments.flatMap(m => m.metadata.people?.encountered_users || [])
  const uniqueUsers = new Set(allEncounters.map(e => e.user_id))
  
  const userStats = Array.from(uniqueUsers).map(userId => {
    const userEncounters = allEncounters.filter(e => e.user_id === userId)
    const totalDuration = userEncounters.reduce((sum, e) => sum + e.shared_duration, 0)
    const maxStrength = Math.max(...userEncounters.map(e => e.interaction_strength))
    const encounterCount = userEncounters.length
    
    return {
      user_id: userId,
      encounter_count: encounterCount,
      total_duration: totalDuration,
      max_interaction_strength: maxStrength,
      avg_interaction_strength: userEncounters.reduce((sum, e) => sum + e.interaction_strength, 0) / encounterCount,
      interaction_types: [...new Set(userEncounters.map(e => e.interaction_type))]
    }
  })

  const totalPeopleEncountered = moments.reduce((sum, m) => sum + (m.metadata.people?.total_people_count || 0), 0)
  
  return {
    unique_connections: uniqueUsers.size,
    total_people_encountered: totalPeopleEncountered,
    strongest_connections: userStats
      .sort((a, b) => b.max_interaction_strength - a.max_interaction_strength)
      .slice(0, 5),
    most_frequent_connections: userStats
      .sort((a, b) => b.encounter_count - a.encounter_count)
      .slice(0, 5),
    longest_interactions: userStats
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, 5)
  }
}

/**
 * Analyze location patterns and journey details
 */
export function analyzeLocationPatterns(moments: Array<{ metadata: ProcessedMomentMetadata }>) {
  const momentsWithLocations = moments.filter(m => m.metadata.location?.coordinates)
  
  if (momentsWithLocations.length === 0) {
    return {
      total_distance: 0,
      unique_venues: 0,
      venue_types: [],
      journey_path: []
    }
  }

  const totalDistance = momentsWithLocations.reduce((sum, m) => 
    sum + (m.metadata.location?.distance_from_previous || 0), 0)
  
  const venues = momentsWithLocations
    .map(m => m.metadata.location?.venue_name)
    .filter(Boolean)
  
  const uniqueVenues = new Set(venues)
  
  // Analyze venue types (basic categorization)
  const venueTypes = venues.map(venue => categorizeVenue(venue!))
  const venueTypeStats = venueTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    total_distance: totalDistance,
    formatted_distance: formatDistance(totalDistance),
    unique_venues: uniqueVenues.size,
    venue_types: Object.entries(venueTypeStats)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => ({ type, count })),
    journey_path: momentsWithLocations.map(m => ({
      venue_name: m.metadata.location?.venue_name,
      coordinates: m.metadata.location?.coordinates,
      distance_from_previous: m.metadata.location?.distance_from_previous
    }))
  }
}

/**
 * Basic venue categorization based on name
 */
function categorizeVenue(venueName: string): string {
  const name = venueName.toLowerCase()
  
  if (name.includes('coffee') || name.includes('cafe')) return 'cafe'
  if (name.includes('restaurant') || name.includes('dining')) return 'restaurant'
  if (name.includes('bar') || name.includes('pub')) return 'bar'
  if (name.includes('park') || name.includes('trail')) return 'outdoor'
  if (name.includes('gym') || name.includes('fitness')) return 'fitness'
  if (name.includes('office') || name.includes('work')) return 'work'
  if (name.includes('home') || name.includes('house')) return 'home'
  if (name.includes('shop') || name.includes('store')) return 'retail'
  if (name.includes('hotel') || name.includes('accommodation')) return 'lodging'
  
  return 'other'
}

/**
 * Generate summary insights from processed moment data
 */
export function generateMomentInsights(moments: Array<{ metadata: ProcessedMomentMetadata }>) {
  const peopleAnalysis = analyzePeopleEncounters(moments)
  const locationAnalysis = analyzeLocationPatterns(moments)
  
  const vibes = moments
    .map(m => m.metadata.vibe)
    .filter(Boolean)
  
  const dominantVibe = vibes.length > 0 
    ? vibes.reduce((acc, vibe) => {
        acc[vibe!] = (acc[vibe!] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    : {}
  
  const topVibe = Object.entries(dominantVibe)
    .sort(([,a], [,b]) => b - a)[0]

  return {
    moment_count: moments.length,
    dominant_vibe: topVibe?.[0] || 'neutral',
    people_insights: peopleAnalysis,
    location_insights: locationAnalysis,
    social_score: peopleAnalysis.unique_connections * 10 + 
                  (peopleAnalysis.total_people_encountered * 2),
    exploration_score: Math.min(100, locationAnalysis.unique_venues * 15 + 
                                     (locationAnalysis.total_distance / 1000) * 5)
  }
}