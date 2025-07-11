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

    const { venueId } = await req.json();

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: 'Venue ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parallelize all data fetching for better performance
    const [
      { data: venue, error: venueError },
      { data: allPresence },
      { data: recentPosts }
    ] = await Promise.all([
      supabase
        .from('venues')
        .select('id, name, lat, lng, description')
        .eq('id', venueId)
        .single(),
      
      supabase
        .from('venue_live_presence')
        .select('user_id, vibe, checked_in_at, last_heartbeat')
        .eq('venue_id', venueId)
        .gt('expires_at', new Date().toISOString()),
      
      supabase
        .from('venue_feed_posts')
        .select(`
          id, content_type, text_content, vibe, mood_tags, created_at,
          view_count, reaction_count,
          profiles!inner(username, display_name, avatar_url)
        `)
        .eq('venue_id', venueId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (venueError || !venue) {
      console.error('Venue error:', venueError);
      return new Response(
        JSON.stringify({ error: 'Venue not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate metrics from live data
    const peopleCount = allPresence?.length || 0;
    const vibes = allPresence?.map(p => p.vibe) || [];
    const vibeCounts = vibes.reduce((acc: any, vibe) => {
      acc[vibe] = (acc[vibe] || 0) + 1;
      return acc;
    }, {});
    
    const dominantVibe = Object.keys(vibeCounts).reduce((a, b) => 
      vibeCounts[a] > vibeCounts[b] ? a : b, vibes[0] || 'chill');
    
    const vibe_diversity_score = Math.min(Object.keys(vibeCounts).length * 20, 100);
    
    // Calculate average session duration
    const now = new Date();
    const sessionDurations = allPresence?.map(p => {
      const checkedIn = new Date(p.checked_in_at);
      return (now.getTime() - checkedIn.getTime()) / 1000 / 60; // minutes
    }) || [];
    
    const avg_session_minutes = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;

    const energy_level = Math.min(peopleCount * 10 + vibe_diversity_score, 100);

    const metrics = {
      venue_id: venueId,
      name: venue.name,
      people_count: peopleCount,
      avg_session_minutes,
      dominant_vibe: dominantVibe,
      vibe_diversity_score,
      energy_level,
      active_floq_count: 0, // TODO: Add floq count calculation
      total_floq_members: 0,
      last_updated: new Date().toISOString()
    };

    // Get live presence details (who's there right now)
    const { data: livePresence, error: presenceError } = await supabase
      .from('venue_live_presence')
      .select(`
        user_id,
        vibe,
        checked_in_at,
        session_duration,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .order('checked_in_at', { ascending: false });

    if (presenceError) {
      console.error('Presence error:', presenceError);
    }

    // Get recent vibe feed posts
    const { data: recentPosts, error: postsError } = await supabase
      .from('venue_feed_posts')
      .select(`
        id,
        content_type,
        text_content,
        vibe,
        mood_tags,
        created_at,
        view_count,
        reaction_count,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (postsError) {
      console.error('Posts error:', postsError);
    }

    // Calculate social texture insights
    const socialTexture = {
      // Energy pulse (0-100)
      energyPulse: metrics?.energy_level || 0,
      
      // Mood description
      moodDescription: generateMoodDescription(
        metrics?.dominant_vibe,
        metrics?.people_count,
        metrics?.avg_session_minutes
      ),
      
      // Social dynamics
      socialDynamics: {
        crowdSize: categorizeCloud(metrics?.people_count || 0),
        vibeStability: metrics?.vibe_diversity_score || 0,
        sessionIntensity: categorizeIntensity(metrics?.avg_session_minutes || 0),
      },
      
      // Timing insights
      timingInsights: generateTimingInsights(livePresence || []),
    };

    const result = {
      ...metrics,
      livePresence: livePresence || [],
      recentPosts: recentPosts || [],
      socialTexture,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-venue-social-energy:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMoodDescription(vibe: string, peopleCount: number, avgSession: number) {
  const vibeDescriptions: Record<string, string> = {
    chill: "Relaxed and laid-back",
    hype: "High energy and exciting",
    curious: "Exploratory and inquisitive", 
    social: "Friendly and conversational",
    solo: "Contemplative and peaceful",
    romantic: "Intimate and cozy",
    weird: "Quirky and unconventional",
    down: "Mellow and introspective",
    flowing: "Dynamic and adaptive",
    open: "Welcoming and inclusive"
  };

  const base = vibeDescriptions[vibe] || "Mixed energy";
  
  if (peopleCount === 0) return "Quiet and empty";
  if (peopleCount === 1) return `${base}, one person present`;
  
  const crowdModifier = peopleCount > 10 ? "bustling" : peopleCount > 5 ? "active" : "intimate";
  const sessionModifier = avgSession > 60 ? "people are settling in" : 
                         avgSession > 30 ? "steady flow" : "quick visits";
  
  return `${base}, ${crowdModifier} scene, ${sessionModifier}`;
}

function categorizeIntensity(avgMinutes: number): string {
  if (avgMinutes > 90) return "Deep immersion";
  if (avgMinutes > 45) return "Engaged hanging out";
  if (avgMinutes > 15) return "Casual stopping by";
  return "Quick check-ins";
}

function categorizeCloud(count: number): string {
  if (count === 0) return "Empty";
  if (count === 1) return "Solo";
  if (count <= 3) return "Intimate";
  if (count <= 8) return "Small group";
  if (count <= 15) return "Active";
  return "Bustling";
}

function generateTimingInsights(presence: any[]): any {
  if (!presence.length) return { recommendation: "Be the first to check in!" };
  
  const now = new Date();
  const recentCheckIns = presence.filter(p => {
    const checkedIn = new Date(p.checked_in_at);
    return (now.getTime() - checkedIn.getTime()) < 30 * 60 * 1000; // 30 minutes
  });
  
  if (recentCheckIns.length > presence.length * 0.7) {
    return { 
      recommendation: "Energy is building - great time to join!",
      trend: "rising"
    };
  }
  
  return {
    recommendation: "Steady vibe, good time to connect",
    trend: "stable"
  };
}