import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useGeo } from '@/hooks/useGeo';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/lib/location/standardGeo';
import { FriendNetworkAnalyzer, EnhancedVibeMatching } from '@/lib/venue-intelligence/friendNetworkAnalysis';
import { CrowdIntelligenceAnalyzer } from '@/lib/venue-intelligence/crowdIntelligence';
import { 
  withErrorHandling, 
  createFallbackRecommendations, 
  optimizeRecommendations,
  VenueRecommendationErrorHandler 
} from '@/lib/venue-intelligence/errorHandling';

export interface VenueRecommendation {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  distance: string;
  travelTime: string;
  imageUrl: string;
  
  // Intelligence matching
  vibeMatch: {
    score: number;
    explanation: string;
    userVibes: string[];
    venueVibes: string[];
    synergy: string;
  };
  
  // Crowd predictions
  crowdIntelligence: {
    currentCapacity: number;
    predictedPeak: string;
    typicalCrowd: string;
    friendCompatibility: string;
    busyTimes: { [hour: string]: number };
  };
  
  // Social proof
  socialProof: {
    friendVisits: number;
    recentVisitors: string[];
    networkRating: number;
    popularWith: string;
    testimonials?: string[];
  };
  
  // Contextual factors
  context: {
    dayOfWeek: string;
    timeRelevance: string;
    weatherSuitability: string;
    eventContext: string;
    moodAlignment: string;
  };
  
  // Real-time factors
  realTime: {
    liveEvents: string[];
    waitTime: string;
    specialOffers: string[];
    atmosphereLevel: 'low' | 'moderate' | 'high' | 'peak';
    nextEventTime?: string;
  };
  
  // Confidence and reasoning
  confidence: number;
  topReasons: string[];
  warnings?: string[];
}

interface DatabaseVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  categories: string[];
  rating: number | null;
  photo_url: string | null;
  price_tier: string | null;
  vibe: string | null;
  source: string;
}

interface WeatherData {
  condition: string;
  temperatureF: number;
  feelsLikeF: number;
  humidity: number;
  windMph: number;
  icon: string;
}

interface SocialProofData {
  friendVisits: number;
  recentVisitors: string[];
  networkRating: number;
  interactionCount: number;
}

interface PresenceData {
  currentCount: number;
  averageCount: number;
  peakHour: number;
}

// Distance calculation helper
function calculateDistanceAndTime(userLat: number, userLng: number, venueLat: number, venueLng: number) {
  const distanceM = calculateDistance(userLat, userLng, venueLat, venueLng);
  const distanceMi = distanceM / 1609.34;
  
  let distance: string;
  let travelTime: string;
  
  if (distanceMi < 0.1) {
    distance = `${Math.round(distanceM)}m`;
    travelTime = '2 min walk';
  } else if (distanceMi < 1) {
    distance = `${(distanceMi * 10).toFixed(0)}0m`;
    travelTime = `${Math.round(distanceMi * 12)} min walk`;
  } else {
    distance = `${distanceMi.toFixed(1)} mi`;
    const walkTime = Math.round(distanceMi * 20);
    const driveTime = Math.round(distanceMi * 3);
    travelTime = walkTime < 25 ? `${walkTime} min walk` : `${driveTime} min drive`;
  }
  
  return { distance, travelTime, distanceM, distanceMi };
}



// Weather suitability assessment
function assessWeatherSuitability(weather: WeatherData | null, venueCategories: string[]): string {
  if (!weather) return "Weather data unavailable";
  
  const isOutdoor = venueCategories.some(cat => 
    cat.toLowerCase().includes('park') || 
    cat.toLowerCase().includes('outdoor') ||
    cat.toLowerCase().includes('garden')
  );
  
  const temp = weather.temperatureF;
  const condition = weather.condition.toLowerCase();
  
  if (isOutdoor) {
    if (condition.includes('rain') || condition.includes('storm')) {
      return "Indoor alternative recommended due to rain";
    }
    if (temp < 45) return "Bundle up - it's chilly outside";
    if (temp > 85) return "Perfect weather for outdoor activities";
    return "Great outdoor weather conditions";
  } else {
    if (condition.includes('rain') || condition.includes('storm')) {
      return "Perfect indoor spot to wait out the weather";
    }
    return "Indoor venue - weather won't be a factor";
  }
}



export const useVenueRecommendations = () => {
  const { user } = useAuth();
  const { coords } = useGeo();
  const [data, setData] = useState<VenueRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [dataQuality, setDataQuality] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    if (!user || !coords) {
      setLoading(false);
      return;
    }

    const fetchVenueRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        setFallbackUsed(false);
        VenueRecommendationErrorHandler.clearErrors();

        // 1. Fetch nearby venues from database with error handling
        const venues = await withErrorHandling(
          async () => {
            const { data, error } = await supabase
              .from('venues')
              .select('*')
              .not('lat', 'is', null)
              .not('lng', 'is', null)
              .limit(50);
            
            if (error) throw error;
            return data;
          },
          'VENUE_FETCH_ERROR',
          []
        );

        if (!venues?.length) {
          setData([]);
          setDataQuality('low');
          return;
        }

        // 2. Calculate distances and filter to nearby venues (within 5 miles)
        const nearbyVenues = venues
          .map(venue => ({
            ...venue,
            ...calculateDistanceAndTime(coords.lat, coords.lng, venue.lat, venue.lng)
          }))
          .filter(venue => venue.distanceMi <= 5)
          .sort((a, b) => a.distanceM - b.distanceM)
          .slice(0, 20); // Top 20 closest venues

        if (nearbyVenues.length === 0) {
          setData([]);
          return;
        }

        // 3. Get weather data for contextual recommendations
        let weatherData: WeatherData | null = null;
        try {
          const weatherResponse = await supabase.functions.invoke('get_weather', {
            body: { lat: coords.lat, lng: coords.lng }
          });
          weatherData = weatherResponse.data;
        } catch (weatherError) {
          console.warn('Weather data unavailable:', weatherError);
        }

        // 4. Get social proof data for each venue
        const venueIds = nearbyVenues.map(v => v.id);
        
        // Get friend visits and interactions
        const [venueStaysResult, interactionsResult, presenceResult] = await Promise.all([
          // Friend visits from venue_stays
          supabase
            .from('venue_stays')
            .select(`
              venue_id,
              profile_id,
              arrived_at,
              profiles!inner(display_name)
            `)
            .in('venue_id', venueIds)
            .gte('arrived_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
            .order('arrived_at', { ascending: false }),
          
          // User interactions
          supabase
            .from('user_venue_interactions')
            .select('venue_id, interaction_type, interaction_count')
            .in('venue_id', venueIds),
          
          // Current presence from vibes_now
          supabase
            .from('vibes_now')
            .select('venue_id')
            .in('venue_id', venueIds)
            .gt('expires_at', new Date().toISOString())
        ]);

        // 5. Process social proof data
        const socialProofMap = new Map<string, SocialProofData>();
        const presenceMap = new Map<string, PresenceData>();

        // Process venue stays for friend visits
        if (venueStaysResult.data) {
          for (const stay of venueStaysResult.data) {
            const current = socialProofMap.get(stay.venue_id) || {
              friendVisits: 0,
              recentVisitors: [],
              networkRating: 4.0,
              interactionCount: 0
            };
            
            current.friendVisits++;
            if (current.recentVisitors.length < 3 && stay.profiles?.display_name) {
              const timeAgo = Math.floor((Date.now() - new Date(stay.arrived_at).getTime()) / (24 * 60 * 60 * 1000));
              current.recentVisitors.push(`${stay.profiles.display_name} (${timeAgo} days ago)`);
            }
            
            socialProofMap.set(stay.venue_id, current);
          }
        }

        // Process interactions
        if (interactionsResult.data) {
          for (const interaction of interactionsResult.data) {
            const current = socialProofMap.get(interaction.venue_id) || {
              friendVisits: 0,
              recentVisitors: [],
              networkRating: 4.0,
              interactionCount: 0
            };
            
            current.interactionCount += interaction.interaction_count;
            socialProofMap.set(interaction.venue_id, current);
          }
        }

        // Process current presence
        if (presenceResult.data) {
          for (const presence of presenceResult.data) {
            const current = presenceMap.get(presence.venue_id) || {
              currentCount: 0,
              averageCount: 2,
              peakHour: 19
            };
            
            current.currentCount++;
            presenceMap.set(presence.venue_id, current);
          }
        }

        // 6. Get user's current vibes (mock for now - would come from vibe detection)
        const userVibes = ['social', 'flowing']; // This would be dynamic based on user's current vibe

        // 7. Initialize intelligence analyzers
        const friendNetworkAnalyzer = new FriendNetworkAnalyzer(user.id);
        const enhancedVibeMatching = new EnhancedVibeMatching(user.id);

        // 8. Get user's venue history for personalization
        const { data: userHistory } = await supabase
          .from('venue_stays')
          .select(`
            venue_id,
            arrived_at,
            venues!inner(categories, rating)
          `)
          .eq('profile_id', user.id)
          .gte('arrived_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .limit(50);

        // 9. Transform venues into recommendations with enhanced intelligence
        const recommendations: VenueRecommendation[] = await Promise.all(nearbyVenues.map(async venue => {
          const socialProof = socialProofMap.get(venue.id) || {
            friendVisits: 0,
            recentVisitors: [],
            networkRating: 4.0,
            interactionCount: 0
          };
          
          const presence = presenceMap.get(venue.id) || {
            currentCount: 0,
            averageCount: 2,
            peakHour: 19
          };

          // Enhanced intelligence analysis
          const [networkInsights, enhancedVibeMatch, crowdIntelligenceData] = await Promise.all([
            friendNetworkAnalyzer.analyzeVenueForNetwork(venue.id),
            enhancedVibeMatching.calculateEnhancedVibeMatch(
              userVibes, 
              venue.categories || [], 
              venue.vibe,
              userHistory || []
            ),
            new CrowdIntelligenceAnalyzer(venue.id).analyzeCrowdIntelligence(
              venue.categories || [],
              presence.currentCount
            )
          ]);

          const weatherSuitability = assessWeatherSuitability(weatherData, venue.categories || []);

          // Calculate atmosphere level based on current presence
          let atmosphereLevel: 'low' | 'moderate' | 'high' | 'peak' = 'low';
          if (crowdIntelligenceData.currentCapacity >= 80) atmosphereLevel = 'peak';
          else if (crowdIntelligenceData.currentCapacity >= 60) atmosphereLevel = 'high';
          else if (crowdIntelligenceData.currentCapacity >= 35) atmosphereLevel = 'moderate';

          // Generate contextual factors
          const now = new Date();
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayOfWeek = `Perfect ${dayNames[now.getDay()]} energy - ${venue.categories?.[0]?.toLowerCase().includes('bar') ? 'great for socializing' : 'ideal for relaxation'}`;
          
          const hour = now.getHours();
          const timeRelevance = hour < 12 ? 'Great morning spot for starting your day' :
                               hour < 17 ? 'Perfect afternoon location for a break' :
                               hour < 21 ? 'Ideal evening destination for winding down' :
                               'Late night option for night owls';

          const moodAlignment = enhancedVibeMatch.score > 0.7 ? 'Perfectly matches your current energy level' :
                               enhancedVibeMatch.score > 0.5 ? 'Good complement to your current mood' :
                               'Interesting contrast to your current vibe';

          // Calculate enhanced confidence score
          const confidence = Math.min(0.95, Math.max(0.3, 
            (enhancedVibeMatch.score * 0.35) + 
            (networkInsights.compatibilityScore.overallScore * 0.25) + 
            (Math.min(crowdIntelligenceData.currentCapacity / 100, 1) * 0.15) + 
            (Math.min(networkInsights.friendVisits.length / 10, 1) * 0.15) + 
            0.1
          ));

          // Generate enhanced top reasons
          const topReasons = [
            `Vibe alignment is ${enhancedVibeMatch.score > 0.8 ? 'exceptional' : enhancedVibeMatch.score > 0.6 ? 'strong' : 'good'} (${Math.round(enhancedVibeMatch.score * 100)}% match)`,
            networkInsights.friendVisits.length > 0 ? `${networkInsights.friendVisits.length} friends have visited recently` : 'Discover something new for your network',
            `Only ${venue.distance} away - ${venue.travelTime}`,
            `${crowdIntelligenceData.bestTimeToVisit}`,
            weatherSuitability.includes('Perfect') || weatherSuitability.includes('Great') ? 'Weather conditions are ideal' : 'Indoor comfort regardless of weather'
          ];

          // Add personalized factors if available
          if (enhancedVibeMatch.personalizedFactors.length > 0) {
            topReasons.push(enhancedVibeMatch.personalizedFactors[0]);
          }

          return {
            id: venue.id,
            name: venue.name,
            category: venue.categories?.[0] || 'Venue',
            address: venue.address || 'Address not available',
            rating: venue.rating || 4.0,
            priceLevel: (venue.price_tier as '$' | '$$' | '$$$' | '$$$$') || '$$',
            distance: venue.distance,
            travelTime: venue.travelTime,
            imageUrl: venue.photo_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
            
            vibeMatch: {
              score: enhancedVibeMatch.score,
              explanation: enhancedVibeMatch.explanation,
              userVibes: enhancedVibeMatch.userVibes,
              venueVibes: enhancedVibeMatch.venueVibes,
              synergy: enhancedVibeMatch.synergy
            },
            
            crowdIntelligence: {
              currentCapacity: crowdIntelligenceData.currentCapacity,
              predictedPeak: crowdIntelligenceData.predictedPeak,
              typicalCrowd: crowdIntelligenceData.typicalCrowd,
              friendCompatibility: networkInsights.compatibilityScore.compatibilityReasons.join(', ') || crowdIntelligenceData.friendCompatibility,
              busyTimes: crowdIntelligenceData.busyTimes
            },
            
            socialProof: {
              friendVisits: networkInsights.friendVisits.length,
              recentVisitors: networkInsights.friendVisits.slice(0, 3).map(f => 
                `${f.displayName} (${Math.floor((Date.now() - new Date(f.lastVisit).getTime()) / (24 * 60 * 60 * 1000))} days ago)`
              ),
              networkRating: networkInsights.networkRating,
              popularWith: networkInsights.compatibilityScore.overallScore > 0.7 ? "Your social circle loves this spot" : 
                          networkInsights.compatibilityScore.overallScore > 0.4 ? "Some friends have discovered this place" :
                          "Waiting for your friend group to discover it",
              testimonials: networkInsights.testimonials.map(t => t.comment)
            },
            
            context: {
              dayOfWeek,
              timeRelevance,
              weatherSuitability,
              eventContext: "Great for continuing your current energy flow",
              moodAlignment
            },
            
            realTime: {
              liveEvents: [], // Would be populated from events API
              waitTime: crowdIntelligenceData.waitTimeEstimate,
              specialOffers: [], // Would be populated from offers API
              atmosphereLevel,
              nextEventTime: undefined
            },
            
            confidence,
            topReasons,
            warnings: crowdIntelligenceData.currentCapacity > 80 ? ['Gets quite busy - arrive early for best experience'] : 
                     networkInsights.socialTrends.trendDirection === 'declining' ? ['Popularity seems to be declining recently'] : undefined
          };
        }));

        // 10. Sort by enhanced recommendation score
        recommendations.sort((a, b) => {
          const scoreA = (a.vibeMatch.score * 0.35) + 
                        (a.socialProof.friendVisits / 20 * 0.25) + 
                        (a.crowdIntelligence.currentCapacity / 100 * 0.15) +
                        (1 / (1 + parseFloat(a.distance)) * 0.25);
          const scoreB = (b.vibeMatch.score * 0.35) + 
                        (b.socialProof.friendVisits / 20 * 0.25) + 
                        (b.crowdIntelligence.currentCapacity / 100 * 0.15) +
                        (1 / (1 + parseFloat(b.distance)) * 0.25);
          return scoreB - scoreA;
        });

        // Optimize and validate recommendations
        const optimizedRecommendations = optimizeRecommendations(recommendations);
        const topRecommendations = optimizedRecommendations.slice(0, 10);
        
        // Assess overall data quality
        const qualityScores = topRecommendations.map(r => {
          const hasRealTime = r.realTime.waitTime !== 'Wait time unknown';
          const hasSocialProof = r.socialProof.friendVisits > 0;
          const hasDetailedVibe = r.vibeMatch.explanation.length > 50;
          return [hasRealTime, hasSocialProof, hasDetailedVibe].filter(Boolean).length;
        });
        
        const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
        setDataQuality(avgQuality >= 2 ? 'high' : avgQuality >= 1 ? 'medium' : 'low');
        
        setData(topRecommendations);
      } catch (err) {
        console.error('Error fetching venue recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
        
        // Try to provide fallback recommendations
        try {
          const venues = await supabase
            .from('venues')
            .select('*')
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .limit(10);
            
          if (venues.data?.length) {
            const fallbackRecommendations = createFallbackRecommendations(
              venues.data,
              coords ? { lat: coords.lat, lng: coords.lng } : undefined
            );
            setData(fallbackRecommendations);
            setFallbackUsed(true);
            setDataQuality('low');
          } else {
            setData([]);
          }
        } catch (fallbackError) {
          console.error('Fallback recommendations also failed:', fallbackError);
          setData([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVenueRecommendations();
  }, [user, coords]);

  return { 
    data, 
    loading, 
    error, 
    fallbackUsed, 
    dataQuality,
    errorStats: VenueRecommendationErrorHandler.getErrorStats()
  };
};