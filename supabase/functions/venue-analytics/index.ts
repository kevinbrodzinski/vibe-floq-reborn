import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AnalyticsEvent {
  user_id: string;
  venue_id: string;
  recommendation_id: string;
  event_type: 'view' | 'click' | 'favorite' | 'visit' | 'share';
  confidence_score?: number;
  vibe_match_score?: number;
  social_proof_score?: number;
  crowd_intelligence_score?: number;
  proximity_score?: number;
  novelty_score?: number;
  metadata?: Record<string, any>;
}

interface AnalyticsRequest {
  mode: 'track_event' | 'track_batch' | 'get_analytics' | 'get_venue_performance' | 'get_user_engagement';
  events?: AnalyticsEvent[];
  event?: AnalyticsEvent;
  user_id?: string;
  venue_id?: string;
  time_window_hours?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AnalyticsRequest = await req.json();
    const { mode } = body;

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
      case 'track_event':
        return await handleTrackEvent(body.event!, user.id);
      
      case 'track_batch':
        return await handleTrackBatch(body.events!, user.id);
      
      case 'get_analytics':
        return await handleGetAnalytics(body.user_id || user.id, body.time_window_hours);
      
      case 'get_venue_performance':
        return await handleGetVenuePerformance(body.venue_id!, body.time_window_hours);
      
      case 'get_user_engagement':
        return await handleGetUserEngagement(body.user_id || user.id, body.time_window_hours);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in venue-analytics:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleTrackEvent(event: AnalyticsEvent, authenticatedUserId: string): Promise<Response> {
  try {
    // Verify user can track events for this user_id
    if (event.user_id !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: 'Cannot track events for other users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert analytics event
    const { error: insertError } = await supabase
      .from('venue_recommendation_analytics')
      .insert({
        profile_id: event.user_id,
        venue_id: event.venue_id,
        recommendation_id: event.recommendation_id,
        event_type: event.event_type,
        confidence_score: event.confidence_score,
        vibe_match_score: event.vibe_match_score,
        social_proof_score: event.social_proof_score,
        crowd_intelligence_score: event.crowd_intelligence_score,
        proximity_score: event.proximity_score,
        novelty_score: event.novelty_score,
        metadata: event.metadata || {}
      });

    if (insertError) {
      console.error('Error inserting analytics event:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to track event' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Also update user venue interactions for ML training
    if (['click', 'favorite', 'visit'].includes(event.event_type)) {
      await supabase.rpc('upsert_venue_interaction_safe', {
        p_profile_id: event.user_id,
        p_venue_id: event.venue_id,
        p_interaction_type: event.event_type,
        p_metadata: event.metadata || {}
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Event tracked successfully',
      event_type: event.event_type,
      venue_id: event.venue_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleTrackEvent:', error);
    return new Response(JSON.stringify({ error: 'Failed to track event' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleTrackBatch(events: AnalyticsEvent[], authenticatedUserId: string): Promise<Response> {
  try {
    // Verify all events belong to authenticated user
    const invalidEvents = events.filter(event => event.user_id !== authenticatedUserId);
    if (invalidEvents.length > 0) {
      return new Response(JSON.stringify({ error: 'Cannot track events for other users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare batch insert data
    const analyticsData = events.map(event => ({
      profile_id: event.user_id,
      venue_id: event.venue_id,
      recommendation_id: event.recommendation_id,
      event_type: event.event_type,
      confidence_score: event.confidence_score,
      vibe_match_score: event.vibe_match_score,
      social_proof_score: event.social_proof_score,
      crowd_intelligence_score: event.crowd_intelligence_score,
      proximity_score: event.proximity_score,
      novelty_score: event.novelty_score,
      metadata: event.metadata || {}
    }));

    // Batch insert analytics events
    const { error: insertError } = await supabase
      .from('venue_recommendation_analytics')
      .insert(analyticsData);

    if (insertError) {
      console.error('Error batch inserting analytics events:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to track batch events' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user venue interactions for high-value events
    const highValueEvents = events.filter(event => 
      ['click', 'favorite', 'visit'].includes(event.event_type)
    );

    for (const event of highValueEvents) {
      await supabase.rpc('upsert_venue_interaction_safe', {
        p_profile_id: event.user_id,
        p_venue_id: event.venue_id,
        p_interaction_type: event.event_type,
        p_metadata: event.metadata || {}
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${events.length} events tracked successfully`,
      events_processed: events.length,
      high_value_events: highValueEvents.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleTrackBatch:', error);
    return new Response(JSON.stringify({ error: 'Failed to track batch events' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetAnalytics(userId: string, timeWindowHours: number = 24): Promise<Response> {
  try {
    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();

    // Get user's analytics data
    const { data: events, error: eventsError } = await supabase
      .from('venue_recommendation_analytics')
      .select('*')
      .eq('profile_id', userId)
      .gte('created_at', timeWindowStart)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching analytics events:', eventsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        analytics: {
          total_events: 0,
          event_breakdown: {},
          average_confidence: 0,
          average_scores: {},
          engagement_metrics: {
            click_through_rate: 0,
            favorite_rate: 0,
            visit_rate: 0
          },
          time_window_hours: timeWindowHours
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate analytics metrics
    const eventBreakdown = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageConfidence = events
      .filter(e => e.confidence_score !== null)
      .reduce((sum, e) => sum + (e.confidence_score || 0), 0) / events.length;

    const averageScores = {
      vibe_match: calculateAverage(events, 'vibe_match_score'),
      social_proof: calculateAverage(events, 'social_proof_score'),
      crowd_intelligence: calculateAverage(events, 'crowd_intelligence_score'),
      proximity: calculateAverage(events, 'proximity_score'),
      novelty: calculateAverage(events, 'novelty_score')
    };

    const views = eventBreakdown.view || 0;
    const clicks = eventBreakdown.click || 0;
    const favorites = eventBreakdown.favorite || 0;
    const visits = eventBreakdown.visit || 0;

    const engagementMetrics = {
      click_through_rate: views > 0 ? clicks / views : 0,
      favorite_rate: views > 0 ? favorites / views : 0,
      visit_rate: views > 0 ? visits / views : 0
    };

    return new Response(JSON.stringify({
      success: true,
      analytics: {
        total_events: events.length,
        event_breakdown: eventBreakdown,
        average_confidence: averageConfidence,
        average_scores: averageScores,
        engagement_metrics: engagementMetrics,
        time_window_hours: timeWindowHours,
        data_quality: {
          events_with_scores: events.filter(e => e.confidence_score !== null).length,
          score_completeness: events.filter(e => e.confidence_score !== null).length / events.length
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGetAnalytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to get analytics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetVenuePerformance(venueId: string, timeWindowHours: number = 168): Promise<Response> {
  try {
    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();

    // Get venue performance data
    const { data: events, error: eventsError } = await supabase
      .from('venue_recommendation_analytics')
      .select('*')
      .eq('venue_id', venueId)
      .gte('created_at', timeWindowStart)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching venue performance:', eventsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch venue performance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get venue details
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('name, categories, rating')
      .eq('id', venueId)
      .single();

    if (venueError) {
      console.error('Error fetching venue details:', venueError);
      return new Response(JSON.stringify({ error: 'Venue not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        venue_performance: {
          venue_id: venueId,
          venue_name: venue.name,
          venue_categories: venue.categories,
          venue_rating: venue.rating,
          total_events: 0,
          event_breakdown: {},
          average_confidence: 0,
          unique_users: 0,
          conversion_metrics: {
            view_to_click: 0,
            view_to_favorite: 0,
            view_to_visit: 0
          },
          time_window_hours: timeWindowHours
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate venue performance metrics
    const eventBreakdown = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageConfidence = events
      .filter(e => e.confidence_score !== null)
      .reduce((sum, e) => sum + (e.confidence_score || 0), 0) / events.length;

    const uniqueUsers = new Set(events.map(e => e.profile_id)).size;

    const views = eventBreakdown.view || 0;
    const clicks = eventBreakdown.click || 0;
    const favorites = eventBreakdown.favorite || 0;
    const visits = eventBreakdown.visit || 0;

    const conversionMetrics = {
      view_to_click: views > 0 ? clicks / views : 0,
      view_to_favorite: views > 0 ? favorites / views : 0,
      view_to_visit: views > 0 ? visits / views : 0
    };

    // Calculate performance trends (last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const recentEvents = events.filter(e => e.created_at >= sevenDaysAgo);
    const previousEvents = events.filter(e => e.created_at >= fourteenDaysAgo && e.created_at < sevenDaysAgo);

    const trend = {
      recent_events: recentEvents.length,
      previous_events: previousEvents.length,
      growth_rate: previousEvents.length > 0 
        ? (recentEvents.length - previousEvents.length) / previousEvents.length 
        : recentEvents.length > 0 ? 1 : 0
    };

    return new Response(JSON.stringify({
      success: true,
      venue_performance: {
        venue_id: venueId,
        venue_name: venue.name,
        venue_categories: venue.categories,
        venue_rating: venue.rating,
        total_events: events.length,
        event_breakdown: eventBreakdown,
        average_confidence: averageConfidence,
        unique_users: uniqueUsers,
        conversion_metrics: conversionMetrics,
        performance_trend: trend,
        time_window_hours: timeWindowHours
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGetVenuePerformance:', error);
    return new Response(JSON.stringify({ error: 'Failed to get venue performance' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetUserEngagement(userId: string, timeWindowHours: number = 168): Promise<Response> {
  try {
    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();

    // Get user engagement data
    const { data: events, error: eventsError } = await supabase
      .from('venue_recommendation_analytics')
      .select(`
        *,
        venues!inner(name, categories)
      `)
      .eq('profile_id', userId)
      .gte('created_at', timeWindowStart)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching user engagement:', eventsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user engagement' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({
        success: true,
              user_engagement: {
        profile_id: userId,
        total_events: 0,
          engagement_score: 0,
          preferred_categories: [],
          vibe_preferences: { min: 0, max: 1 },
          activity_pattern: {
            most_active_hour: 12,
            most_active_day: 'Monday',
            session_frequency: 0
          },
          time_window_hours: timeWindowHours
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate engagement metrics
    const engagementEvents = events.filter(e => ['click', 'favorite', 'visit'].includes(e.event_type));
    const engagementScore = events.length > 0 ? engagementEvents.length / events.length : 0;

    // Analyze preferred categories
    const categoryCount = new Map<string, number>();
    events.forEach(event => {
      if (event.venues?.categories) {
        event.venues.categories.forEach((category: string) => {
          categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        });
      }
    });

    const preferredCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Analyze vibe preferences
    const vibeScores = events
      .filter(e => e.vibe_match_score !== null)
      .map(e => e.vibe_match_score!);
    
    const vibePreferences = vibeScores.length > 0 ? {
      min: Math.min(...vibeScores),
      max: Math.max(...vibeScores),
      average: vibeScores.reduce((sum, score) => sum + score, 0) / vibeScores.length
    } : { min: 0, max: 1, average: 0.5 };

    // Analyze activity patterns
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<string, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    events.forEach(event => {
      const date = new Date(event.created_at);
      const hour = date.getHours();
      const dayName = dayNames[date.getDay()];
      
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      dayCounts.set(dayName, (dayCounts.get(dayName) || 0) + 1);
    });

    const mostActiveHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
    
    const mostActiveDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

    // Calculate session frequency (unique days with activity)
    const uniqueDays = new Set(events.map(e => new Date(e.created_at).toDateString())).size;
    const sessionFrequency = uniqueDays / (timeWindowHours / 24);

    return new Response(JSON.stringify({
      success: true,
      user_engagement: {
        profile_id: userId,
        total_events: events.length,
        engagement_score: engagementScore,
        preferred_categories: preferredCategories,
        vibe_preferences: vibePreferences,
        activity_pattern: {
          most_active_hour: mostActiveHour,
          most_active_day: mostActiveDay,
          session_frequency: sessionFrequency,
          unique_venues: new Set(events.map(e => e.venue_id)).size
        },
        time_window_hours: timeWindowHours
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGetUserEngagement:', error);
    return new Response(JSON.stringify({ error: 'Failed to get user engagement' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Helper function to calculate averages
function calculateAverage(events: any[], scoreField: string): number {
  const scores = events
    .filter(e => e[scoreField] !== null)
    .map(e => e[scoreField]);
  
  return scores.length > 0 
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
    : 0;
}