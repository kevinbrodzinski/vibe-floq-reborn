import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResonanceMatch {
  userId: string;
  partnerId: string;
  resonanceScore: number;
  factors: {
    sharedInterests: number;
    temporalCompatibility: number;
    spatialResonance: number;
    socialChemistry: number;
  };
  reasoning: string[];
  suggestedActivity: string;
  suggestedTime: string;
  suggestedLocation: string;
}

interface FrequentPattern {
  venue_id: string;
  venue_name: string;
  time_of_day: string;
  day_of_week: number;
  frequency_score: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify authentication
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { userId, limit = 5, currentLat, currentLng } = await req.json();

    console.log(`Generating resonance matches for user ${userId}`);

    // 1. Get user's frequent venue patterns
    const frequentPatterns = await getFrequentPatterns(supabase, userId);
    console.log(`Found ${frequentPatterns.length} frequent patterns for user`);

    // 2. Find users with overlapping patterns
    const potentialMatches = await findOverlappingUsers(supabase, userId, frequentPatterns);
    console.log(`Found ${potentialMatches.length} potential matches`);

    // 3. Calculate resonance scores for each match
    const resonanceMatches: ResonanceMatch[] = [];
    
    for (const match of potentialMatches.slice(0, limit * 3)) { // Get more for better filtering
      const resonanceData = await supabase.rpc('calculate_resonance_score', {
        p_user_id: userId,
        p_partner_id: match.partner_id
      });

      if (resonanceData.data && resonanceData.data.resonanceScore > 15) { // Only include meaningful matches
        const resonanceMatch = await buildResonanceMatch(
          supabase, 
          userId, 
          match.partner_id, 
          resonanceData.data,
          currentLat,
          currentLng
        );
        
        if (resonanceMatch) {
          resonanceMatches.push(resonanceMatch);
        }
      }
    }

    // 4. Sort by score and return top matches
    resonanceMatches.sort((a, b) => b.resonanceScore - a.resonanceScore);
    const topMatches = resonanceMatches.slice(0, limit);

    console.log(`Returning ${topMatches.length} resonance matches`);

    return new Response(JSON.stringify({
      matches: topMatches,
      generated_at: new Date().toISOString(),
      algorithm_version: "2.0"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Generate resonance match error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to generate matches",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getFrequentPatterns(supabase: any, userId: string): Promise<FrequentPattern[]> {
  // Get user's venue visit patterns from the last 30 days
  const { data: patterns } = await supabase
    .from('venue_stays')
    .select(`
      venue_id,
      arrived_at,
      venues (
        name
      )
    `)
    .eq('profile_id', userId)
    .gte('arrived_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('arrived_at', { ascending: false });

  if (!patterns) return [];

  // Group by venue and extract temporal patterns
  const venuePatterns = new Map<string, {
    venue_name: string;
    visits: { time_of_day: string; day_of_week: number }[];
  }>();

  patterns.forEach(visit => {
    const visitTime = new Date(visit.arrived_at);
    const hour = visitTime.getHours();
    const dayOfWeek = visitTime.getDay();
    
    const timeOfDay = hour >= 5 && hour <= 11 ? 'morning' :
                     hour >= 12 && hour <= 17 ? 'afternoon' :
                     hour >= 18 && hour <= 22 ? 'evening' : 'night';

    const venueId = visit.venue_id;
    if (!venuePatterns.has(venueId)) {
      venuePatterns.set(venueId, {
        venue_name: visit.venues?.name || 'Unknown Venue',
        visits: []
      });
    }
    
    venuePatterns.get(venueId)!.visits.push({ time_of_day: timeOfDay, day_of_week: dayOfWeek });
  });

  // Convert to FrequentPattern format with frequency scoring
  const frequentPatterns: FrequentPattern[] = [];
  
  venuePatterns.forEach((data, venueId) => {
    if (data.visits.length >= 2) { // Only include venues with multiple visits
      const timePatterns = new Map<string, number>();
      
      data.visits.forEach(visit => {
        const key = `${visit.time_of_day}-${visit.day_of_week}`;
        timePatterns.set(key, (timePatterns.get(key) || 0) + 1);
      });

      // Add patterns with frequency > 1
      timePatterns.forEach((frequency, key) => {
        if (frequency > 1) {
          const [time_of_day, day_of_week] = key.split('-');
          frequentPatterns.push({
            venue_id: venueId,
            venue_name: data.venue_name,
            time_of_day,
            day_of_week: parseInt(day_of_week),
            frequency_score: Math.min(frequency / data.visits.length, 1.0)
          });
        }
      });
    }
  });

  return frequentPatterns;
}

async function findOverlappingUsers(supabase: any, userId: string, patterns: FrequentPattern[]): Promise<{partner_id: string; overlap_score: number}[]> {
  if (patterns.length === 0) return [];

  // Find users who visit similar venues at similar times
  const venueIds = patterns.map(p => p.venue_id);
  
  const { data: overlappingUsers } = await supabase
    .from('venue_stays') 
    .select('profile_id, venue_id, arrived_at')
    .in('venue_id', venueIds)
    .neq('profile_id', userId)
    .gte('arrived_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (!overlappingUsers) return [];

  // Calculate overlap scores
  const userScores = new Map<string, number>();
  
  overlappingUsers.forEach(visit => {
    const visitTime = new Date(visit.arrived_at);
    const hour = visitTime.getHours();
    const dayOfWeek = visitTime.getDay();
    
    const timeOfDay = hour >= 5 && hour <= 11 ? 'morning' :
                     hour >= 12 && hour <= 17 ? 'afternoon' :
                     hour >= 18 && hour <= 22 ? 'evening' : 'night';

    // Find matching patterns
    const matchingPattern = patterns.find(p => 
      p.venue_id === visit.venue_id && 
      p.time_of_day === timeOfDay &&
      Math.abs(p.day_of_week - dayOfWeek) <= 1 // Allow 1 day flexibility
    );

    if (matchingPattern) {
      const currentScore = userScores.get(visit.profile_id) || 0;
      userScores.set(visit.profile_id, currentScore + matchingPattern.frequency_score);
    }
  });

  // Convert to array and sort by overlap score
  const matches = Array.from(userScores.entries())
    .map(([partner_id, overlap_score]) => ({ partner_id, overlap_score }))
    .filter(match => match.overlap_score > 0.5) // Minimum threshold
    .sort((a, b) => b.overlap_score - a.overlap_score);

  return matches.slice(0, 20); // Return top 20 candidates
}

async function buildResonanceMatch(
  supabase: any, 
  userId: string, 
  partnerId: string, 
  resonanceData: any,
  currentLat?: number,
  currentLng?: number
): Promise<ResonanceMatch | null> {
  try {
    // Get partner profile info
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', partnerId)
      .single();

    if (!partnerProfile) return null;

    // Find suggested meeting location (shared venue)
    const { data: sharedVenues } = await supabase
      .from('venue_stays')
      .select(`
        venue_id,
        venues (
          name,
          lat,
          lng
        )
      `)
      .in('profile_id', [userId, partnerId])
      .gte('arrived_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    // Find most frequent shared venue
    let suggestedLocation = "Coffee shop nearby";
    if (sharedVenues && sharedVenues.length > 0) {
      const venueCounts = new Map<string, {name: string; count: number; lat?: number; lng?: number}>();
      
      sharedVenues.forEach(visit => {
        const venueId = visit.venue_id;
        const existing = venueCounts.get(venueId) || { name: 'Unknown', count: 0 };
        venueCounts.set(venueId, {
          name: visit.venues?.name || 'Unknown Venue',
          count: existing.count + 1,
          lat: visit.venues?.lat,
          lng: visit.venues?.lng
        });
      });

      const topVenue = Array.from(venueCounts.values())
        .sort((a, b) => b.count - a.count)[0];
      
      if (topVenue && topVenue.count >= 2) {
        suggestedLocation = topVenue.name;
      }
    }

    // Generate reasoning based on factors
    const reasoning: string[] = [];
    const factors = resonanceData.factors;
    
    if (factors.spatialResonance > 10) {
      reasoning.push("You both frequent similar locations");
    }
    if (factors.temporalCompatibility > 10) {
      reasoning.push("You have compatible schedules");
    }
    if (factors.socialChemistry > 5) {
      reasoning.push("You share mutual connections");
    }
    if (factors.sharedInterests > 15) {
      reasoning.push("Strong vibe compatibility detected");
    }

    // Suggest optimal meeting time based on patterns
    const suggestedTime = factors.temporalCompatibility > 15 ? 
      "Today 6:30pm" : "This weekend afternoon";

    // Generate activity suggestion
    const suggestedActivity = generateActivitySuggestion(factors, suggestedLocation);

    return {
      userId,
      partnerId,
      resonanceScore: resonanceData.resonanceScore,
      factors: resonanceData.factors,
      reasoning,
      suggestedActivity,
      suggestedTime,
      suggestedLocation
    };

  } catch (error) {
    console.error(`Error building resonance match for ${partnerId}:`, error);
    return null;
  }
}

function generateActivitySuggestion(factors: any, location: string): string {
  const activities = [
    "Coffee & conversation",
    "Casual meetup", 
    "Shared workspace session",
    "Walking meeting",
    "Lunch & chat"
  ];

  // Choose based on factors - more sophisticated logic could be added here
  if (factors.spatialResonance > 15) {
    return `${activities[0]} at ${location}`;
  } else if (factors.temporalCompatibility > 15) {
    return activities[1];
  } else {
    return activities[2];
  }
}