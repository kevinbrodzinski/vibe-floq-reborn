import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { userId, venueId } = await req.json();

    if (!userId || !venueId) {
      return new Response(
        JSON.stringify({ error: 'User ID and Venue ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's current vibe and preferences
    const { data: userVibe, error: vibeError } = await supabase
      .from('vibes_now')
      .select('vibe, user_id')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (vibeError) {
      console.error('User vibe error:', vibeError);
      return new Response(
        JSON.stringify({ error: 'Could not find user current vibe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get other people at the venue with compatible vibes
    const { data: potentialMatches, error: matchError } = await supabase
      .from('venue_live_presence')
      .select(`
        user_id,
        vibe,
        checked_in_at,
        session_duration,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          bio,
          interests
        )
      `)
      .eq('venue_id', venueId)
      .neq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (matchError) {
      console.error('Match error:', matchError);
      return new Response(
        JSON.stringify({ error: 'Failed to find potential matches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's friend network for mutual connections
    const { data: userFriends, error: friendsError } = await supabase
      .from('friendships')
      .select('user_low, user_high')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    const friendIds = userFriends?.map(f => f.user_low === userId ? f.user_high : f.user_low) || [];

    // Get user profile for interest matching
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('interests, username')
      .eq('id', userId)
      .single();

    // Score and rank potential matches
    const scoredMatches = potentialMatches
      ?.map(match => {
        const score = calculateCompatibilityScore(
          userVibe.vibe,
          match.vibe,
          userProfile?.interests || [],
          match.profiles?.interests || [],
          friendIds.includes(match.user_id)
        );

        return {
          ...match,
          compatibilityScore: score,
          matchReasons: generateMatchReasons(
            userVibe.vibe,
            match.vibe,
            userProfile?.interests || [],
            match.profiles?.interests || [],
            friendIds.includes(match.user_id)
          )
        };
      })
      .filter(match => match.compatibilityScore > 0.3) // Only show good matches
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 5) || []; // Top 5 matches

    // Generate Floq suggestions based on the group dynamics
    const floqSuggestions = generateFloqSuggestions(
      userVibe.vibe,
      scoredMatches,
      venueId
    );

    const result = {
      userVibe: userVibe.vibe,
      potentialMatches: scoredMatches,
      floqSuggestions,
      matchCount: scoredMatches.length,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-floq-auto-match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateCompatibilityScore(
  userVibe: string,
  matchVibe: string,
  userInterests: string[],
  matchInterests: string[],
  isMutualFriend: boolean
): number {
  let score = 0;

  // Vibe compatibility matrix
  const vibeCompatibility: Record<string, Record<string, number>> = {
    chill: { chill: 0.9, flowing: 0.8, open: 0.7, social: 0.6, romantic: 0.5 },
    hype: { hype: 0.9, social: 0.8, curious: 0.6, flowing: 0.5 },
    social: { social: 0.9, open: 0.8, hype: 0.7, curious: 0.6, chill: 0.5 },
    romantic: { romantic: 0.9, chill: 0.7, flowing: 0.6, open: 0.5 },
    curious: { curious: 0.9, open: 0.8, social: 0.7, flowing: 0.6 },
    flowing: { flowing: 0.9, open: 0.8, chill: 0.7, curious: 0.6 },
    open: { open: 0.9, social: 0.8, curious: 0.7, flowing: 0.6 },
    weird: { weird: 0.9, curious: 0.7, open: 0.6 },
    down: { down: 0.8, chill: 0.7, solo: 0.6 },
    solo: { solo: 0.6, down: 0.5, chill: 0.4 }
  };

  // Base vibe compatibility (40% of score)
  score += (vibeCompatibility[userVibe]?.[matchVibe] || 0.1) * 0.4;

  // Interest overlap (30% of score)
  if (userInterests.length > 0 && matchInterests.length > 0) {
    const commonInterests = userInterests.filter(interest => 
      matchInterests.includes(interest)
    );
    const interestScore = (commonInterests.length * 2) / 
                         (userInterests.length + matchInterests.length);
    score += interestScore * 0.3;
  }

  // Mutual friend bonus (20% of score)
  if (isMutualFriend) {
    score += 0.2;
  }

  // Random factor for discovery (10% of score)
  score += Math.random() * 0.1;

  return Math.min(score, 1.0);
}

function generateMatchReasons(
  userVibe: string,
  matchVibe: string,
  userInterests: string[],
  matchInterests: string[],
  isMutualFriend: boolean
): string[] {
  const reasons: string[] = [];

  if (userVibe === matchVibe) {
    reasons.push(`Both feeling ${matchVibe}`);
  } else {
    const vibeReasons: Record<string, Record<string, string>> = {
      chill: {
        flowing: "Your chill matches their flow",
        social: "Good balance of energy"
      },
      hype: {
        social: "Both ready to connect",
        curious: "Energy for exploration"
      },
      social: {
        open: "Both welcoming vibes",
        curious: "Great conversation potential"
      }
    };
    
    if (vibeReasons[userVibe]?.[matchVibe]) {
      reasons.push(vibeReasons[userVibe][matchVibe]);
    }
  }

  const commonInterests = userInterests.filter(interest => 
    matchInterests.includes(interest)
  );
  
  if (commonInterests.length > 0) {
    reasons.push(`Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
  }

  if (isMutualFriend) {
    reasons.push("Mutual friend");
  }

  if (reasons.length === 0) {
    reasons.push("Compatible energy");
  }

  return reasons;
}

function generateFloqSuggestions(
  userVibe: string,
  matches: any[],
  venueId: string
): any[] {
  if (matches.length === 0) return [];

  const suggestions = [];

  // Group suggestion based on vibe
  if (matches.length >= 2) {
    const dominantVibe = findDominantVibe([userVibe, ...matches.map(m => m.vibe)]);
    
    suggestions.push({
      type: 'group_vibe',
      title: `${capitalize(dominantVibe)} Squad`,
      description: `Start a ${dominantVibe} session with ${matches.length} compatible people`,
      suggestedMembers: matches.slice(0, 4).map(m => ({
        userId: m.user_id,
        username: m.profiles?.username,
        avatar: m.profiles?.avatar_url
      })),
      primaryVibe: dominantVibe,
      confidence: 0.8
    });
  }

  // Pair suggestion for highest compatibility
  if (matches.length > 0) {
    const bestMatch = matches[0];
    suggestions.push({
      type: 'pair_connection',
      title: `Connect with ${bestMatch.profiles?.username}`,
      description: bestMatch.matchReasons.join(' • '),
      suggestedMembers: [{
        userId: bestMatch.user_id,
        username: bestMatch.profiles?.username,
        avatar: bestMatch.profiles?.avatar_url
      }],
      primaryVibe: userVibe,
      confidence: bestMatch.compatibilityScore
    });
  }

  return suggestions;
}

function findDominantVibe(vibes: string[]): string {
  const counts: Record<string, number> = {};
  vibes.forEach(vibe => {
    counts[vibe] = (counts[vibe] || 0) + 1;
  });
  
  return Object.entries(counts).sort(([,a], [,b]) => b - a)[0][0];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}