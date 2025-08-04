import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VenueIntelligenceRequest {
  mode: 'recommendations' | 'friend_network' | 'crowd_intelligence' | 'vibe_match' | 'analytics';
  user_id: string;
  venue_ids?: string[];
  lat?: number;
  lng?: number;
  user_vibes?: string[];
  limit?: number;
  config?: {
    scoring_weights?: {
      vibe_match?: number;
      social_proof?: number;
      crowd_intelligence?: number;
      proximity?: number;
      novelty?: number;
    };
    max_distance_km?: number;
    min_confidence?: number;
  };
}

interface VenueRecommendation {
  venue: any;
  intelligence: {
    vibe_match: {
      score: number;
      explanation: string;
      user_vibes: string[];
      venue_vibes: string[];
      synergy: string;
      personalized_factors: string[];
    };
    social_proof: {
      friend_visits: number;
      recent_visitors: Array<{
        name: string;
        avatar?: string;
        visit_date: string;
      }>;
      network_rating: number;
      popular_with: string;
    };
    crowd_intelligence: {
      current_capacity: number;
      predicted_peak: string;
      typical_crowd: string;
      friend_compatibility: string;
      busy_times: { [hour: string]: number };
      wait_time_estimate: string;
      best_time_to_visit: string;
    };
    context: {
      day_of_week: string;
      time_relevance: string;
      weather_suitability: string;
      event_context: string;
      mood_alignment: string;
    };
    real_time: {
      live_events: any[];
      wait_time: string;
      special_offers: any[];
      atmosphere_level: 'low' | 'moderate' | 'high' | 'very_high';
      next_event_time?: string;
    };
  };
  scoring: {
    confidence: number;
    top_reasons: string[];
    warnings: string[];
    breakdown: {
      vibe_match: number;
      social_proof: number;
      crowd_intelligence: number;
      proximity: number;
      novelty: number;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: VenueIntelligenceRequest = await req.json();
    const { mode, user_id, venue_ids, lat, lng, user_vibes = [], limit = 10, config = {} } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user auth from request
    const authHeader = req.headers.get('Authorization');
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (!user || authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (mode) {
      case 'recommendations':
        return await handleRecommendations(user_id, lat, lng, user_vibes, limit, config);
      
      case 'friend_network':
        return await handleFriendNetwork(user_id, venue_ids);
      
      case 'crowd_intelligence':
        return await handleCrowdIntelligence(venue_ids);
      
      case 'vibe_match':
        return await handleVibeMatch(user_id, venue_ids, user_vibes);
      
      case 'analytics':
        return await handleAnalytics(user_id, venue_ids);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in venue-intelligence-v2:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

async function handleRecommendations(
  userId: string, 
  lat?: number, 
  lng?: number, 
  userVibes: string[] = [], 
  limit: number = 10,
  config: any = {}
): Promise<Response> {
  try {
    // 1. Get nearby venues using enhanced recommendation summary view
    let venuesQuery = supabase
      .from('v_venue_recommendation_summary')
      .select('*')
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (lat && lng) {
      const maxDistance = config.max_distance_km || 5;
      // Use PostGIS to find venues within radius
      venuesQuery = venuesQuery.rpc('venues_within_radius', {
        center_lat: lat,
        center_lng: lng,
        radius_km: maxDistance
      });
    }

    const { data: venues, error: venuesError } = await venuesQuery.limit(50);
    
    if (venuesError) {
      console.error('Error fetching venues:', venuesError);
      return createErrorResponse('Failed to fetch venues', 500);
    }

    if (!venues?.length) {
      return createSuccessResponse({ recommendations: [], total: 0, mode: 'recommendations' });
    }

    // 2. Get user behavior data for ML
    const { data: userHistory } = await supabase
      .from('venue_stays')
      .select(`
        venue_id,
        arrived_at,
        departed_at,
        venues!inner(categories, rating)
      `)
      .eq('profile_id', userId)
      .gte('arrived_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    // 3. Get friend network data using optimized view
    const { data: friends } = await supabase
      .from('v_friend_ids')
      .select(`
        other_profile_id,
        is_close,
        responded_at
      `);

    // 4. Get current weather if location provided
    let weatherData = null;
    if (lat && lng) {
      const { data: weather } = await supabase.functions.invoke('get_weather', {
        body: { lat, lng }
      });
      weatherData = weather;
    }

    // 5. Process each venue through intelligence engines
    const recommendations: VenueRecommendation[] = [];
    
    for (const venue of venues) {
      try {
        const recommendation = await processVenueIntelligence(
          venue,
          userId,
          userVibes,
          userHistory || [],
          friends || [],
          weatherData,
          lat,
          lng,
          config
        );
        
        if (recommendation.scoring.confidence >= (config.min_confidence || 0.2)) {
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.error(`Error processing venue ${venue.id}:`, error);
        // Continue with other venues
      }
    }

    // 6. Sort by confidence and apply scoring weights
    const scoringWeights = {
      vibe_match: 0.35,
      social_proof: 0.25,
      crowd_intelligence: 0.15,
      proximity: 0.25,
      novelty: 0.1,
      ...config.scoring_weights
    };

    recommendations.forEach(rec => {
      const breakdown = rec.scoring.breakdown;
      const weightedScore = 
        breakdown.vibe_match * scoringWeights.vibe_match +
        breakdown.social_proof * scoringWeights.social_proof +
        breakdown.crowd_intelligence * scoringWeights.crowd_intelligence +
        breakdown.proximity * scoringWeights.proximity +
        breakdown.novelty * scoringWeights.novelty;
      
      rec.scoring.confidence = Math.min(0.95, Math.max(0.1, weightedScore));
    });

    recommendations.sort((a, b) => b.scoring.confidence - a.scoring.confidence);

    return createSuccessResponse({
      recommendations: recommendations.slice(0, limit),
      total: recommendations.length,
      mode: 'recommendations',
      config_used: { ...config, scoring_weights: scoringWeights }
    });

  } catch (error) {
    console.error('Error in handleRecommendations:', error);
    return createErrorResponse('Failed to generate recommendations', 500);
  }
}

async function processVenueIntelligence(
  venue: any,
  userId: string,
  userVibes: string[],
  userHistory: any[],
  friends: any[],
  weatherData: any,
  userLat?: number,
  userLng?: number,
  config: any = {}
): Promise<VenueRecommendation> {
  
  // Calculate distance and travel time
  let distance = 'Unknown';
  let proximityScore = 0.5;
  
  if (userLat && userLng && venue.lat && venue.lng) {
    const distanceKm = calculateDistance(userLat, userLng, venue.lat, venue.lng);
    distance = distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`;
    proximityScore = Math.max(0.1, Math.min(1.0, 1 - (distanceKm / 10))); // Score decreases with distance
  }

  // 1. Vibe Match Analysis
  const vibeMatch = await calculateVibeMatch(venue, userVibes, userHistory);
  
  // 2. Social Proof Analysis
  const socialProof = await calculateSocialProof(venue.id, userId, friends);
  
  // 3. Crowd Intelligence Analysis
  const crowdIntelligence = await calculateCrowdIntelligence(venue.id, venue.categories);
  
  // 4. Context Analysis
  const context = calculateContextualFactors(venue, weatherData);
  
  // 5. Real-time Analysis
  const realTime = await calculateRealTimeFactors(venue.id);
  
  // 6. Novelty Score
  const noveltyScore = calculateNoveltyScore(venue, userHistory);

  // 7. Calculate overall scoring
  const breakdown = {
    vibe_match: vibeMatch.score,
    social_proof: socialProof.score,
    crowd_intelligence: crowdIntelligence.score,
    proximity: proximityScore,
    novelty: noveltyScore
  };

  const confidence = (
    breakdown.vibe_match * 0.35 +
    breakdown.social_proof * 0.25 +
    breakdown.crowd_intelligence * 0.15 +
    breakdown.proximity * 0.25 +
    breakdown.novelty * 0.1
  );

  const topReasons = generateTopReasons(venue, vibeMatch, socialProof, crowdIntelligence, proximityScore);
  const warnings = generateWarnings(venue, vibeMatch, socialProof, crowdIntelligence);

  return {
    venue: {
      ...venue,
      distance,
      travel_time: estimateTravelTime(distance)
    },
    intelligence: {
      vibe_match: vibeMatch,
      social_proof: socialProof,
      crowd_intelligence: crowdIntelligence,
      context,
      real_time: realTime
    },
    scoring: {
      confidence,
      top_reasons: topReasons,
      warnings,
      breakdown
    }
  };
}

// Helper functions for intelligence calculations
async function calculateVibeMatch(venue: any, userVibes: string[], userHistory: any[]) {
  const venueVibes = mapCategoriesToVibes(venue.categories || []);
  const overlap = userVibes.filter(vibe => venueVibes.includes(vibe)).length;
  const score = overlap / Math.max(userVibes.length, venueVibes.length, 1);
  
  // Enhance with personalization based on user history
  const personalizedFactors = [];
  const categoryPreference = calculateCategoryPreference(venue.categories, userHistory);
  
  if (categoryPreference > 0.7) {
    personalizedFactors.push('Matches your frequent venue preferences');
  }

  return {
    score: Math.min(0.95, Math.max(0.3, score + categoryPreference * 0.3)),
    explanation: overlap > 0 
      ? `Strong alignment between your ${userVibes.join(' + ')} vibes and venue's ${venueVibes.join(' + ')} atmosphere`
      : `Complementary energy - your ${userVibes.join(' + ')} vibes could blend well with ${venueVibes.join(' + ')} setting`,
    user_vibes: userVibes,
    venue_vibes: venueVibes,
    synergy: overlap > 1 ? "Multiple vibe alignments create natural connection" : "Complementary energies create interesting dynamic",
    personalized_factors: personalizedFactors
  };
}

async function calculateSocialProof(venueId: string, userId: string, friends: any[]) {
  // Get friend visits to this venue using optimized view
  const friendIds = friends.map(f => f.other_profile_id);
  
  const { data: friendVisits } = await supabase
    .from('v_friends_with_presence')
    .select(`
      friend_id,
      display_name,
      avatar_url
    `)
    .in('friend_id', friendIds)
    .eq('friend_state', 'accepted');

  // Get venue visits for these friends
  const { data: venueVisits } = await supabase
    .from('venue_stays')
    .select(`
      profile_id,
      arrived_at
    `)
    .eq('venue_id', venueId)
    .in('profile_id', friendIds)
    .gte('arrived_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
    .order('arrived_at', { ascending: false })
    .limit(5);

  // Combine friend data with visit data
  const recentVisitors = (venueVisits || []).slice(0, 3).map(visit => {
    const friend = friendVisits?.find(f => f.friend_id === visit.profile_id);
    return {
      name: friend?.display_name || 'Friend',
      avatar: friend?.avatar_url || '',
      visit_date: visit.arrived_at
    };
  });

  const score = Math.min(1.0, (venueVisits?.length || 0) / 5); // Max score at 5 friend visits

  return {
    score,
    friend_visits: venueVisits?.length || 0,
    recent_visitors: recentVisitors,
    network_rating: 4.0 + score, // Base rating enhanced by social proof
    popular_with: venueVisits?.length 
      ? `${venueVisits.length} friend${venueVisits.length > 1 ? 's' : ''} visited recently`
      : "Discover something new for your network"
  };
}

async function calculateCrowdIntelligence(venueId: string, categories: string[]) {
  // Get current presence data using optimized view
  const { data: currentPresence } = await supabase
    .from('v_active_users')
    .select('profile_id, vibe, updated_at')
    .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes
  
  // Filter to users near this venue (would need venue coordinates for exact filtering)
  // For now, using all active users as approximation

  const currentCapacity = Math.min(100, (currentPresence?.length || 0) * 15 + 20);
  
  // Generate busy times based on venue type
  const busyTimes = generateBusyTimes(categories);
  
  const currentHour = new Date().getHours();
  const peakHour = Object.entries(busyTimes)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  return {
    score: Math.max(0.3, Math.min(1.0, (100 - currentCapacity) / 100)), // Higher score for less crowded
    current_capacity: currentCapacity,
    predicted_peak: `${peakHour}:00 (busy period)`,
    typical_crowd: generateTypicalCrowd(categories, new Date().getDay(), currentHour),
    friend_compatibility: `${60 + Math.random() * 30}% of your network enjoys venues like this`,
    busy_times: busyTimes,
    wait_time_estimate: generateWaitTimeEstimate(currentCapacity, categories),
    best_time_to_visit: findBestTimeToVisit(busyTimes)
  };
}

function calculateContextualFactors(venue: any, weatherData: any) {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[now.getDay()];
  const hour = now.getHours();
  
  let timeRelevance = 'Suitable for current time';
  if (venue.categories?.some((cat: string) => cat.toLowerCase().includes('bar')) && hour >= 17) {
    timeRelevance = 'Perfect time for evening drinks';
  } else if (venue.categories?.some((cat: string) => cat.toLowerCase().includes('cafe')) && hour <= 11) {
    timeRelevance = 'Great time for coffee and morning vibes';
  }

  let weatherSuitability = 'Indoor venue - weather won\'t be a factor';
  if (weatherData?.current?.weather?.[0]?.main === 'Rain') {
    weatherSuitability = 'Perfect indoor option for rainy weather';
  } else if (weatherData?.current?.weather?.[0]?.main === 'Clear' && venue.categories?.some((cat: string) => cat.toLowerCase().includes('outdoor'))) {
    weatherSuitability = 'Beautiful weather perfect for this outdoor venue';
  }

  return {
    day_of_week: `Good option for ${dayOfWeek}`,
    time_relevance: timeRelevance,
    weather_suitability: weatherSuitability,
    event_context: 'Great for casual visits',
    mood_alignment: 'Adaptable to different moods'
  };
}

async function calculateRealTimeFactors(venueId: string) {
  // Get live events, special offers, etc.
  const { data: liveEvents } = await supabase
    .from('venue_events')
    .select('*')
    .eq('venue_id', venueId)
    .gte('start_time', new Date().toISOString())
    .lte('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    .limit(3);

  const { data: specialOffers } = await supabase
    .from('venue_offers')
    .select('*')
    .eq('venue_id', venueId)
    .eq('active', true)
    .gte('expires_at', new Date().toISOString())
    .limit(3);

  return {
    live_events: liveEvents || [],
    wait_time: 'Estimated wait time not available',
    special_offers: specialOffers || [],
    atmosphere_level: 'moderate' as const,
    next_event_time: liveEvents?.[0]?.start_time
  };
}

// Utility functions
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function mapCategoriesToVibes(categories: string[]): string[] {
  const vibeMap: { [key: string]: string[] } = {
    'restaurant': ['social', 'flowing'],
    'bar': ['energetic', 'social'],
    'cafe': ['flowing', 'mindful', 'creative'],
    'coffee': ['flowing', 'creative'],
    'club': ['energetic', 'social'],
    'gym': ['energetic', 'focused'],
    'library': ['mindful', 'focused'],
    'park': ['flowing', 'mindful']
  };

  const vibes: string[] = [];
  categories.forEach(category => {
    const categoryLower = category.toLowerCase();
    for (const [key, categoryVibes] of Object.entries(vibeMap)) {
      if (categoryLower.includes(key)) {
        vibes.push(...categoryVibes);
        break;
      }
    }
  });

  return [...new Set(vibes)];
}

function calculateCategoryPreference(venueCategories: string[], userHistory: any[]): number {
  if (!userHistory.length) return 0;

  const userCategoryCount = new Map<string, number>();
  userHistory.forEach(visit => {
    visit.venues?.categories?.forEach((cat: string) => {
      userCategoryCount.set(cat, (userCategoryCount.get(cat) || 0) + 1);
    });
  });

  let matchScore = 0;
  let totalUserVisits = userHistory.length;

  venueCategories?.forEach(category => {
    const userVisitsForCategory = userCategoryCount.get(category) || 0;
    matchScore += userVisitsForCategory / totalUserVisits;
  });

  return Math.min(1.0, matchScore);
}

function generateBusyTimes(categories: string[]): { [hour: string]: number } {
  const busyTimes: { [hour: string]: number } = {};
  const isBar = categories?.some(cat => cat.toLowerCase().includes('bar'));
  const isCafe = categories?.some(cat => cat.toLowerCase().includes('cafe'));
  const isRestaurant = categories?.some(cat => cat.toLowerCase().includes('restaurant'));

  for (let hour = 6; hour <= 23; hour++) {
    let capacity = 30;
    
    if (isCafe) {
      if (hour >= 7 && hour <= 9) capacity = 80;
      else if (hour >= 12 && hour <= 14) capacity = 70;
    } else if (isBar) {
      if (hour >= 17 && hour <= 23) capacity = 85;
    } else if (isRestaurant) {
      if (hour >= 12 && hour <= 14) capacity = 75;
      else if (hour >= 18 && hour <= 21) capacity = 85;
    }
    
    busyTimes[hour.toString()] = capacity;
  }
  
  return busyTimes;
}

function generateTypicalCrowd(categories: string[], dayOfWeek: number, hour: number): string {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isEvening = hour >= 17;
  
  if (categories?.some(cat => cat.toLowerCase().includes('bar'))) {
    if (isWeekend && isEvening) return "Young professionals, friend groups, date night couples";
    if (isEvening) return "After-work crowd, casual meetups, happy hour groups";
    return "Casual crowd, remote workers, afternoon socializers";
  }
  
  return "Mixed crowd of locals and visitors";
}

function generateWaitTimeEstimate(capacity: number, categories: string[]): string {
  if (capacity < 40) return 'No wait currently';
  if (capacity < 60) return '5-10 minute wait expected';
  if (capacity < 80) return '15-20 minute wait expected';
  return '25+ minute wait expected';
}

function findBestTimeToVisit(busyTimes: { [hour: string]: number }): string {
  const idealTimes = Object.entries(busyTimes)
    .filter(([_, capacity]) => capacity >= 35 && capacity <= 65)
    .sort((a, b) => Math.abs(a[1] - 50) - Math.abs(b[1] - 50));

  if (idealTimes.length === 0) return 'Flexible timing recommended';
  
  const bestHour = parseInt(idealTimes[0][0]);
  const formatHour = (h: number) => h < 12 ? `${h || 12}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  
  return `${formatHour(bestHour)} for optimal experience`;
}

function calculateNoveltyScore(venue: any, userHistory: any[]): number {
  const hasVisited = userHistory.some(visit => visit.venue_id === venue.id);
  if (hasVisited) return 0.2; // Low novelty for visited venues
  
  const similarCategories = userHistory.filter(visit => 
    visit.venues?.categories?.some((cat: string) => 
      venue.categories?.includes(cat)
    )
  ).length;
  
  return Math.max(0.3, 1.0 - (similarCategories / userHistory.length));
}

function generateTopReasons(venue: any, vibeMatch: any, socialProof: any, crowdIntelligence: any, proximityScore: number): string[] {
  const reasons = [];
  
  if (vibeMatch.score > 0.7) reasons.push(`${Math.round(vibeMatch.score * 100)}% vibe match`);
  if (socialProof.friend_visits > 0) reasons.push(`${socialProof.friend_visits} friends visited recently`);
  if (crowdIntelligence.current_capacity < 50) reasons.push('Not too crowded right now');
  if (proximityScore > 0.8) reasons.push('Very close to your location');
  if (venue.rating > 4.2) reasons.push(`Highly rated (${venue.rating}/5)`);
  
  return reasons.slice(0, 4);
}

function generateWarnings(venue: any, vibeMatch: any, socialProof: any, crowdIntelligence: any): string[] {
  const warnings = [];
  
  if (crowdIntelligence.current_capacity > 80) warnings.push('Very busy right now');
  if (vibeMatch.score < 0.4) warnings.push('May not match your usual preferences');
  if (socialProof.friend_visits === 0) warnings.push('None of your friends have visited recently');
  
  return warnings;
}

function estimateTravelTime(distance: string): string {
  if (distance === 'Unknown') return 'Unknown';
  
  const distanceNum = parseFloat(distance);
  if (distance.includes('m')) {
    return `${Math.round(distanceNum / 80)} min walk`;
  } else {
    const minutes = Math.round(distanceNum * 3); // Rough estimate: 3 min per km
    return `${minutes} min`;
  }
}

// Placeholder handlers for other modes
async function handleFriendNetwork(userId: string, venueIds?: string[]): Promise<Response> {
  return createSuccessResponse({ message: 'Friend network analysis not yet implemented', mode: 'friend_network' });
}

async function handleCrowdIntelligence(venueIds?: string[]): Promise<Response> {
  return createSuccessResponse({ message: 'Crowd intelligence analysis not yet implemented', mode: 'crowd_intelligence' });
}

async function handleVibeMatch(userId: string, venueIds?: string[], userVibes?: string[]): Promise<Response> {
  return createSuccessResponse({ message: 'Vibe match analysis not yet implemented', mode: 'vibe_match' });
}

async function handleAnalytics(userId: string, venueIds?: string[]): Promise<Response> {
  return createSuccessResponse({ message: 'Analytics not yet implemented', mode: 'analytics' });
}

function createSuccessResponse(data: any): Response {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}