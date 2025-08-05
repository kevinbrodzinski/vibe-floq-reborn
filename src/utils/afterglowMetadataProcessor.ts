import { calculateDistance, formatDistance } from './locationHelpers'

// Types for afterglow metadata processing
interface VenueIntelligenceData {
  vibe_match: {
    score: number;
    explanation: string;
    user_vibes: string[];
    venue_vibes: string[];
  };
  social_proof: {
    friend_visits: number;
    recent_visitors: string[];
    network_rating: number;
    popular_with: string;
  };
  crowd_intelligence: {
    current_capacity: number;
    predicted_peak: string;
    typical_crowd: string;
    best_time_to_visit: string;
  };
}

interface SocialIntelligenceData {
  friend_network_strength: number;
  mutual_connections: number;
  social_energy_level: 'low' | 'medium' | 'high';
}

export interface ProcessedMomentMetadata {
  location?: {
    coordinates?: [number, number]
    venue_name?: string
    venue_id?: string
    address?: string
    distance_from_previous?: number
    venue_intelligence?: VenueIntelligenceData
  }
  people?: {
    encountered_users: Array<{
      profile_id: string
      interaction_strength: number
      shared_duration: number
      interaction_type: string
    }>
    total_people_count: number
    social_intelligence?: SocialIntelligenceData
  }
  social_context?: {
    floq_id?: string
    group_size?: number
    activity_type?: string
  }
  vibe?: string
  intensity?: number
}

export interface EnhancedProcessedMomentMetadata extends ProcessedMomentMetadata {
  venue_intelligence_score?: number;
  social_intelligence_score?: number;
  overall_intelligence_score?: number;
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
  const uniqueUsers = new Set(allEncounters.map(e => e.profile_id))
  
  const userStats = Array.from(uniqueUsers).map(profileId => {
    const userEncounters = allEncounters.filter(e => e.profile_id === profileId)
    const totalDuration = userEncounters.reduce((sum, e) => sum + e.shared_duration, 0)
    const maxStrength = Math.max(...userEncounters.map(e => e.interaction_strength))
    const encounterCount = userEncounters.length
    
    return {
      profile_id: profileId,
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
 * Enhance metadata with venue intelligence data
 */
export function enhanceMetadataWithVenueIntelligence(
  metadata: ProcessedMomentMetadata,
  venueIntelligence: VenueIntelligenceData
): EnhancedProcessedMomentMetadata {
  const venueIntelligenceScore = calculateVenueIntelligenceScore(venueIntelligence);
  const socialIntelligenceScore = metadata.people?.social_intelligence 
    ? calculateSocialIntelligenceScore(metadata.people.social_intelligence)
    : 0;

  return {
    ...metadata,
    location: {
      ...metadata.location,
      venue_intelligence: venueIntelligence
    },
    venue_intelligence_score: venueIntelligenceScore,
    social_intelligence_score: socialIntelligenceScore,
    overall_intelligence_score: (venueIntelligenceScore + socialIntelligenceScore) / 2
  };
}

/**
 * Enhance metadata with social intelligence data
 */
export function enhanceMetadataWithSocialIntelligence(
  metadata: ProcessedMomentMetadata,
  socialIntelligence: SocialIntelligenceData
): EnhancedProcessedMomentMetadata {
  const socialIntelligenceScore = calculateSocialIntelligenceScore(socialIntelligence);
  const venueIntelligenceScore = metadata.location?.venue_intelligence
    ? calculateVenueIntelligenceScore(metadata.location.venue_intelligence)
    : 0;

  return {
    ...metadata,
    people: {
      ...metadata.people!,
      social_intelligence: socialIntelligence
    },
    venue_intelligence_score: venueIntelligenceScore,
    social_intelligence_score: socialIntelligenceScore,
    overall_intelligence_score: (venueIntelligenceScore + socialIntelligenceScore) / 2
  };
}

/**
 * Calculate venue intelligence score from 0-100
 */
function calculateVenueIntelligenceScore(venueIntelligence: VenueIntelligenceData): number {
  const vibeScore = venueIntelligence.vibe_match.score * 100;
  const socialScore = Math.min(100, venueIntelligence.social_proof.friend_visits * 20);
  const crowdScore = Math.min(100, venueIntelligence.crowd_intelligence.current_capacity);
  
  return Math.round((vibeScore + socialScore + crowdScore) / 3);
}

/**
 * Calculate social intelligence score from 0-100
 */
function calculateSocialIntelligenceScore(socialIntelligence: SocialIntelligenceData): number {
  const networkScore = socialIntelligence.friend_network_strength * 100;
  const connectionScore = Math.min(100, socialIntelligence.mutual_connections * 10);
  const energyScore = socialIntelligence.social_energy_level === 'high' ? 100 : 
                     socialIntelligence.social_energy_level === 'medium' ? 60 : 30;
  
  return Math.round((networkScore + connectionScore + energyScore) / 3);
}

/**
 * Analyze venue intelligence patterns across moments
 */
export function analyzeVenueIntelligencePatterns(moments: Array<{ metadata: EnhancedProcessedMomentMetadata }>) {
  const momentsWithVenueIntelligence = moments.filter(m => m.metadata.location?.venue_intelligence);
  
  if (momentsWithVenueIntelligence.length === 0) {
    return {
      avg_vibe_match_score: 0,
      social_proof_strength: 0,
      crowd_intelligence_summary: 'No venue intelligence data',
      venue_recommendations: [],
      intelligence_trend: 'stable' as const
    };
  }

  const vibeScores = momentsWithVenueIntelligence.map(m => 
    m.metadata.location!.venue_intelligence!.vibe_match.score
  );
  const avgVibeScore = vibeScores.reduce((sum, score) => sum + score, 0) / vibeScores.length;

  const friendVisits = momentsWithVenueIntelligence.map(m => 
    m.metadata.location!.venue_intelligence!.social_proof.friend_visits
  );
  const totalFriendVisits = friendVisits.reduce((sum, visits) => sum + visits, 0);

  const crowdLevels = momentsWithVenueIntelligence.map(m => 
    m.metadata.location!.venue_intelligence!.crowd_intelligence.current_capacity
  );
  const avgCrowdLevel = crowdLevels.reduce((sum, level) => sum + level, 0) / crowdLevels.length;

  // Generate venue recommendations based on patterns
  const venueRecommendations = generateVenueRecommendations(momentsWithVenueIntelligence);

  return {
    avg_vibe_match_score: Math.round(avgVibeScore * 100) / 100,
    social_proof_strength: totalFriendVisits,
    crowd_intelligence_summary: avgCrowdLevel > 70 ? 'High energy venues' : 
                               avgCrowdLevel > 40 ? 'Moderate energy venues' : 'Quiet, intimate venues',
    venue_recommendations: venueRecommendations,
    intelligence_trend: avgVibeScore > 0.7 ? 'improving' as const : 
                       avgVibeScore > 0.4 ? 'stable' as const : 'declining' as const
  };
}

/**
 * Generate venue recommendations based on venue intelligence patterns
 */
function generateVenueRecommendations(moments: Array<{ metadata: EnhancedProcessedMomentMetadata }>): string[] {
  const recommendations: string[] = [];
  
  const highVibeVenues = moments.filter(m => 
    m.metadata.location?.venue_intelligence?.vibe_match.score && 
    m.metadata.location.venue_intelligence.vibe_match.score > 0.7
  );
  
  if (highVibeVenues.length > 0) {
    recommendations.push('Continue exploring venues with high vibe matches');
  }

  const socialVenues = moments.filter(m => 
    m.metadata.location?.venue_intelligence?.social_proof.friend_visits && 
    m.metadata.location.venue_intelligence.social_proof.friend_visits > 0
  );
  
  if (socialVenues.length > 0) {
    recommendations.push('Check out venues where your friends have been');
  }

  const crowdVenues = moments.filter(m => 
    m.metadata.location?.venue_intelligence?.crowd_intelligence.current_capacity && 
    m.metadata.location.venue_intelligence.crowd_intelligence.current_capacity > 50
  );
  
  if (crowdVenues.length > 0) {
    recommendations.push('Try visiting during peak times for more energy');
  }

  return recommendations.length > 0 ? recommendations : ['Explore new venues to build your intelligence profile'];
}

/**
 * Generate summary insights from processed moment data
 */
export function generateMomentInsights(moments: Array<{ metadata: ProcessedMomentMetadata | EnhancedProcessedMomentMetadata }>) {
  const peopleAnalysis = analyzePeopleEncounters(moments)
  const locationAnalysis = analyzeLocationPatterns(moments)
  
  // Check if we have enhanced moments with venue intelligence
  const enhancedMoments = moments.filter(m => 
    'venue_intelligence_score' in m.metadata
  ) as Array<{ metadata: EnhancedProcessedMomentMetadata }>;
  
  const venueIntelligenceAnalysis = enhancedMoments.length > 0 
    ? analyzeVenueIntelligencePatterns(enhancedMoments)
    : null;
  
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

  // Enhanced social score with venue intelligence
  const baseSocialScore = peopleAnalysis.unique_connections * 10 + 
                         (peopleAnalysis.total_people_encountered * 2);
  const socialIntelligenceBonus = enhancedMoments.reduce((sum, m) => 
    sum + (m.metadata.social_intelligence_score || 0), 0) / Math.max(enhancedMoments.length, 1) * 0.5;
  
  // Enhanced exploration score with venue intelligence
  const baseExplorationScore = Math.min(100, locationAnalysis.unique_venues * 15 + 
                                            (locationAnalysis.total_distance / 1000) * 5);
  const venueIntelligenceBonus = enhancedMoments.reduce((sum, m) => 
    sum + (m.metadata.venue_intelligence_score || 0), 0) / Math.max(enhancedMoments.length, 1) * 0.3;

  return {
    moment_count: moments.length,
    dominant_vibe: topVibe?.[0] || 'neutral',
    people_insights: peopleAnalysis,
    location_insights: locationAnalysis,
    // Enhanced scores with venue intelligence
    social_score: Math.round(baseSocialScore + socialIntelligenceBonus),
    exploration_score: Math.round(baseExplorationScore + venueIntelligenceBonus),
    // New venue intelligence insights
    venue_intelligence_insights: venueIntelligenceAnalysis,
    has_venue_intelligence: enhancedMoments.length > 0,
    intelligence_coverage: enhancedMoments.length / moments.length
  }
}