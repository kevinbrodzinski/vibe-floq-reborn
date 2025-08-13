import { usePersonalizedVenues } from '@/hooks/usePersonalizedVenues';
import { useGeo } from '@/hooks/useGeo';
import { useCurrentVibe } from '@/lib/store/useVibe';

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

export const useVenueRecommendations = () => {
  const { coords } = useGeo();
  const currentVibe = useCurrentVibe();
  
  // Get personalized venues with LLM enabled for rich recommendations
  const { data: venues = [], isLoading, error } = usePersonalizedVenues(
    coords?.lat || null,
    coords?.lng || null,
    {
      radius: 5000, // 5km radius for broader recommendations
      limit: 10,
      vibe: currentVibe || undefined,
      useLLM: true, // Enable LLM for rich reasoning
      llmTopK: 15
    }
  );

  // Transform PersonalizedVenue[] to VenueRecommendation[]
  const data: VenueRecommendation[] = venues.map((venue, index) => {
    const categories = venue.categories || [];
    const primaryCategory = categories[0] || 'Restaurant';
    const distanceKm = venue.distance_m / 1000;
    const walkTimeMin = Math.round(distanceKm * 12); // ~12 min per km walking
    
    return {
      id: venue.venue_id,
      name: venue.name,
      category: primaryCategory,
      address: venue.address || 'Address not available',
      rating: venue.rating || 4.0,
      priceLevel: venue.price_tier || '$$',
      distance: distanceKm < 1 ? `${venue.distance_m}m` : `${distanceKm.toFixed(1)}km`,
      travelTime: walkTimeMin < 15 ? `${walkTimeMin} min walk` : `${Math.round(walkTimeMin / 3)} min drive`,
      imageUrl: venue.photo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      
      vibeMatch: {
        score: venue.explain?.confidence || venue.personalized_score || 0.75,
        explanation: venue.explain?.why || venue.reason || `Great match for your ${currentVibe || 'current'} vibe`,
        userVibes: currentVibe ? [currentVibe] : ['social'],
        venueVibes: categories.slice(0, 3),
        synergy: venue.explain?.why || venue.reason || "This venue aligns well with your current preferences and location"
      },
      
      crowdIntelligence: {
        currentCapacity: venue.explain?.crowd.currentCapacityPct ? Math.round(venue.explain.crowd.currentCapacityPct * 100) : (venue.live_count ? Math.min(venue.live_count * 10, 90) : 50),
        predictedPeak: venue.explain?.crowd.predictedPeakWindow || "7:00-9:00pm (typical dinner rush)",
        typicalCrowd: categories.includes('bar') ? "Young professionals, social groups" : "Diverse crowd, families and friends",
        friendCompatibility: venue.explain?.social.compatibilityPct ? `${Math.round(venue.explain.social.compatibilityPct * 100)}% compatibility with friends` : `${Math.round((venue.personalized_score || 0.7) * 100)}% match based on your preferences`,
        busyTimes: { '17': 40, '18': 60, '19': 80, '20': 85, '21': 70, '22': 50 }
      },
      
      socialProof: {
        friendVisits: venue.explain?.social.friendsVisitedCount || venue.live_count || 0,
        recentVisitors: venue.explain?.social.friendsRecent?.map(f => f.name) || [],
        networkRating: venue.explain?.social.friendRating || venue.rating || 4.0,
        popularWith: "People with similar tastes",
        testimonials: venue.explain?.topReasons || (venue.reason ? [venue.reason] : undefined)
      },
      
      context: {
        dayOfWeek: "Perfect for today's energy",
        timeRelevance: "Great timing for your current plans",
        weatherSuitability: "Good choice regardless of weather",
        eventContext: "Fits well with your current vibe",
        moodAlignment: venue.reason || "Matches your preferences"
      },
      
      realTime: {
        liveEvents: [],
        waitTime: venue.explain?.crowd.currentWaitMins ? `${venue.explain.crowd.currentWaitMins} min wait expected` : (venue.live_count && venue.live_count > 5 ? "15-20 min wait expected" : "No wait expected"),
        specialOffers: [],
        atmosphereLevel: venue.explain?.crowd.currentCapacityPct ? 
          (venue.explain.crowd.currentCapacityPct > 0.8 ? 'peak' : 
           venue.explain.crowd.currentCapacityPct > 0.6 ? 'high' : 
           venue.explain.crowd.currentCapacityPct > 0.3 ? 'moderate' : 'low') : 
          (venue.live_count && venue.live_count > 10 ? 'high' : 'moderate'),
      },
      
      confidence: venue.explain?.confidence || venue.personalized_score || 0.75,
      topReasons: venue.explain?.topReasons || [
        venue.reason || "Good match for your preferences",
        `${distanceKm < 1 ? 'Very close' : 'Convenient'} location`,
        `${venue.rating ? `${venue.rating.toFixed(1)} star rating` : 'Well-rated venue'}`,
        ...(venue.live_count ? [`${venue.live_count} people currently here`] : [])
      ].filter(Boolean),
      
      warnings: venue.live_count && venue.live_count > 15 ? ["Quite busy right now - expect crowds"] : undefined
    };
  });

  return { 
    data, 
    isLoading, 
    error,
    // Keep compatibility with existing usage
    venues: data 
  };
};