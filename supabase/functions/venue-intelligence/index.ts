import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42";
import { corsHeaders, respondWithCors } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

interface VenueIntelligence {
  venue_id: string;
  enhanced_categories: string[];
  confidence_score: number;
  popularity_trend: 'rising' | 'stable' | 'declining';
  best_times: string[];
  crowd_level: 'low' | 'medium' | 'high';
  vibe_classification: string;
  recommendation_score: number;
  similar_venues: string[];
}

interface IntelligenceRequest {
  venue_ids?: string[];
  location?: { lat: number; lng: number; radius?: number };
  update_all?: boolean;
}

// Venue category mappings and intelligence
const CATEGORY_INTELLIGENCE = {
  // Food & Dining
  restaurant: {
    keywords: ['restaurant', 'dining', 'eatery', 'bistro', 'brasserie', 'grill'],
    vibe_mapping: { casual: 'social', fine_dining: 'sophisticated', fast_food: 'quick' },
    peak_hours: ['12:00-14:00', '18:00-21:00'],
    base_score: 70
  },
  cafe: {
    keywords: ['cafe', 'coffee', 'espresso', 'latte', 'bakery'],
    vibe_mapping: { cozy: 'chill', busy: 'energetic', quiet: 'focused' },
    peak_hours: ['07:00-10:00', '14:00-17:00'],
    base_score: 65
  },
  bar: {
    keywords: ['bar', 'pub', 'tavern', 'brewery', 'cocktail', 'lounge'],
    vibe_mapping: { sports: 'energetic', cocktail: 'sophisticated', dive: 'casual' },
    peak_hours: ['17:00-02:00'],
    base_score: 75
  },
  
  // Entertainment
  nightclub: {
    keywords: ['club', 'nightclub', 'disco', 'dance'],
    vibe_mapping: { electronic: 'energetic', live_music: 'vibrant' },
    peak_hours: ['22:00-04:00'],
    base_score: 80
  },
  
  // Shopping
  shopping: {
    keywords: ['shop', 'store', 'mall', 'boutique', 'retail'],
    vibe_mapping: { luxury: 'sophisticated', outlet: 'practical' },
    peak_hours: ['10:00-20:00'],
    base_score: 60
  },
  
  // Fitness & Health
  gym: {
    keywords: ['gym', 'fitness', 'workout', 'training'],
    vibe_mapping: { crossfit: 'energetic', yoga: 'calm' },
    peak_hours: ['06:00-09:00', '17:00-20:00'],
    base_score: 65
  }
};

// Analyze venue categories and enhance them
function enhanceCategories(venue: any): { categories: string[], confidence: number } {
  const originalCategories = venue.categories || [];
  const name = venue.name?.toLowerCase() || '';
  const description = venue.description?.toLowerCase() || '';
  const address = venue.address?.toLowerCase() || '';
  
  const enhancedCategories = new Set<string>();
  let totalConfidence = 0;
  let categoryCount = 0;

  // Add original categories
  originalCategories.forEach((cat: string) => {
    enhancedCategories.add(cat.toLowerCase());
  });

  // Analyze text content for additional categories
  for (const [category, intelligence] of Object.entries(CATEGORY_INTELLIGENCE)) {
    let matchScore = 0;
    
    intelligence.keywords.forEach(keyword => {
      if (name.includes(keyword)) matchScore += 3;
      if (description.includes(keyword)) matchScore += 2;
      if (address.includes(keyword)) matchScore += 1;
    });

    if (matchScore > 0) {
      enhancedCategories.add(category);
      totalConfidence += matchScore;
      categoryCount++;
    }
  }

  const confidence = categoryCount > 0 ? Math.min(totalConfidence / categoryCount * 10, 100) : 50;
  
  return {
    categories: Array.from(enhancedCategories),
    confidence
  };
}

// Calculate venue popularity trend
function calculatePopularityTrend(venue: any, historicalData: any[]): 'rising' | 'stable' | 'declining' {
  if (!historicalData || historicalData.length < 2) return 'stable';
  
  const recent = historicalData.slice(-7); // Last 7 data points
  const older = historicalData.slice(-14, -7); // Previous 7 data points
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, d) => sum + (d.live_count || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + (d.live_count || 0), 0) / older.length;
  
  const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  
  if (changePercent > 20) return 'rising';
  if (changePercent < -20) return 'declining';
  return 'stable';
}

// Determine best times to visit
function calculateBestTimes(venue: any, historicalData: any[]): string[] {
  const categoryInfo = CATEGORY_INTELLIGENCE[venue.primary_category as keyof typeof CATEGORY_INTELLIGENCE];
  
  if (categoryInfo?.peak_hours) {
    return categoryInfo.peak_hours;
  }

  // Analyze historical data if available
  if (historicalData && historicalData.length > 0) {
    const hourlyActivity = new Map<number, number>();
    
    historicalData.forEach(data => {
      if (data.timestamp) {
        const hour = new Date(data.timestamp).getHours();
        hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + (data.live_count || 0));
      }
    });

    // Find peak hours
    const sortedHours = Array.from(hourlyActivity.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`);

    return sortedHours;
  }

  // Default times
  return ['12:00-14:00', '18:00-21:00'];
}

// Calculate crowd level
function calculateCrowdLevel(venue: any): 'low' | 'medium' | 'high' {
  const liveCount = venue.live_count || 0;
  const popularity = venue.popularity || 0;
  
  const combinedScore = liveCount * 2 + popularity;
  
  if (combinedScore < 10) return 'low';
  if (combinedScore < 30) return 'medium';
  return 'high';
}

// Enhanced vibe classification
function classifyVibe(venue: any, enhancedCategories: string[]): string {
  // Check category-specific vibe mappings
  for (const category of enhancedCategories) {
    const categoryInfo = CATEGORY_INTELLIGENCE[category as keyof typeof CATEGORY_INTELLIGENCE];
    if (categoryInfo?.vibe_mapping) {
      // Use the first available vibe mapping
      const vibes = Object.values(categoryInfo.vibe_mapping);
      if (vibes.length > 0) {
        return vibes[0];
      }
    }
  }

  // Fallback to existing vibe or analyze name
  if (venue.vibe && venue.vibe !== 'mixed') {
    return venue.vibe;
  }

  const name = venue.name?.toLowerCase() || '';
  
  if (name.includes('club') || name.includes('bar')) return 'energetic';
  if (name.includes('cafe') || name.includes('coffee')) return 'chill';
  if (name.includes('restaurant')) return 'social';
  if (name.includes('gym') || name.includes('fitness')) return 'energetic';
  
  return 'mixed';
}

// Calculate recommendation score
function calculateRecommendationScore(venue: any, intelligence: Partial<VenueIntelligence>): number {
  let score = 50; // Base score
  
  // Category-based scoring
  const primaryCategory = intelligence.enhanced_categories?.[0];
  const categoryInfo = CATEGORY_INTELLIGENCE[primaryCategory as keyof typeof CATEGORY_INTELLIGENCE];
  if (categoryInfo) {
    score = categoryInfo.base_score;
  }

  // Adjust for popularity
  if (venue.popularity) {
    score += Math.min(venue.popularity * 0.5, 20);
  }

  // Adjust for rating
  if (venue.rating) {
    score += (venue.rating - 3) * 10; // Scale 1-5 rating to -20 to +20
  }

  // Adjust for live activity
  if (venue.live_count > 0) {
    score += Math.min(venue.live_count * 2, 15);
  }

  // Adjust for trend
  if (intelligence.popularity_trend === 'rising') {
    score += 10;
  } else if (intelligence.popularity_trend === 'declining') {
    score -= 5;
  }

  // Confidence adjustment
  if (intelligence.confidence_score) {
    score += (intelligence.confidence_score - 50) * 0.2;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Find similar venues
async function findSimilarVenues(venue: any, intelligence: Partial<VenueIntelligence>): Promise<string[]> {
  if (!intelligence.enhanced_categories || intelligence.enhanced_categories.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, categories, vibe, rating')
    .neq('id', venue.id)
    .limit(10);

  if (error || !data) return [];

  const similar = data
    .filter(v => {
      // Check category overlap
      const venueCategories = v.categories || [];
      const categoryOverlap = intelligence.enhanced_categories!.some(cat => 
        venueCategories.some((vc: string) => vc.toLowerCase().includes(cat))
      );
      
      // Check vibe similarity
      const vibeSimilar = v.vibe === intelligence.vibe_classification;
      
      return categoryOverlap || vibeSimilar;
    })
    .sort((a, b) => {
      // Sort by rating and category similarity
      const aScore = (a.rating || 0) * 20;
      const bScore = (b.rating || 0) * 20;
      return bScore - aScore;
    })
    .slice(0, 5)
    .map(v => v.id);

  return similar;
}

// Process venue intelligence
async function processVenueIntelligence(venue: any): Promise<VenueIntelligence> {
  // Get historical data for trend analysis
  const { data: historicalData } = await supabase
    .from('venue_live_presence')
    .select('live_count, created_at')
    .eq('venue_id', venue.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Enhance categories
  const { categories: enhancedCategories, confidence } = enhanceCategories(venue);
  
  // Calculate various intelligence metrics
  const popularityTrend = calculatePopularityTrend(venue, historicalData || []);
  const bestTimes = calculateBestTimes(venue, historicalData || []);
  const crowdLevel = calculateCrowdLevel(venue);
  const vibeClassification = classifyVibe(venue, enhancedCategories);
  
  const intelligence: Partial<VenueIntelligence> = {
    venue_id: venue.id,
    enhanced_categories: enhancedCategories,
    confidence_score: confidence,
    popularity_trend: popularityTrend,
    best_times: bestTimes,
    crowd_level: crowdLevel,
    vibe_classification: vibeClassification
  };

  // Calculate recommendation score
  intelligence.recommendation_score = calculateRecommendationScore(venue, intelligence);
  
  // Find similar venues
  intelligence.similar_venues = await findSimilarVenues(venue, intelligence);

  return intelligence as VenueIntelligence;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: { ...corsHeaders, "Content-Length": "0" } 
    });
  }
  
  if (req.method !== "POST") {
    return respondWithCors({ error: "Method not allowed" }, 405);
  }

  try {
    const request: IntelligenceRequest = await req.json();
    const { venue_ids, location, update_all = false } = request;

    let venues: any[] = [];

    // Determine which venues to process
    if (update_all) {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .limit(1000);
      
      if (error) throw error;
      venues = data || [];
    } else if (venue_ids && venue_ids.length > 0) {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .in('id', venue_ids);
      
      if (error) throw error;
      venues = data || [];
    } else if (location) {
      const { lat, lng, radius = 2000 } = location;
      
      // Get venues in radius using PostGIS
      const { data, error } = await supabase.rpc('get_venues_in_bbox', {
        west: lng - (radius / 111000),
        south: lat - (radius / 111000),
        east: lng + (radius / 111000),
        north: lat + (radius / 111000)
      });
      
      if (error) throw error;
      venues = data || [];
    } else {
      throw new Error("Must specify venue_ids, location, or update_all");
    }

    if (venues.length === 0) {
      return respondWithCors({
        ok: true,
        processed: 0,
        message: "No venues found to process"
      });
    }

    console.log(`[VenueIntelligence] Processing ${venues.length} venues`);

    const results: VenueIntelligence[] = [];
    const errors: string[] = [];

    // Process venues in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < venues.length; i += batchSize) {
      const batch = venues.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (venue) => {
        try {
          const intelligence = await processVenueIntelligence(venue);
          results.push(intelligence);
          
          // Update venue with intelligence data
          await supabase
            .from('venues')
            .update({
              vibe: intelligence.vibe_classification,
              vibe_score: intelligence.recommendation_score,
              categories: intelligence.enhanced_categories,
              updated_at: new Date().toISOString()
            })
            .eq('id', venue.id);
            
          return intelligence;
        } catch (error) {
          const errorMsg = `Failed to process venue ${venue.id}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(`[VenueIntelligence] ${errorMsg}`);
          return null;
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < venues.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[VenueIntelligence] Processed ${results.length} venues successfully`);

    return respondWithCors({
      ok: true,
      processed: results.length,
      total_venues: venues.length,
      intelligence_data: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("[VenueIntelligence] Processing failed:", error);
    return respondWithCors({
      ok: false,
      processed: 0,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});