
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VenueQuerySchema = {
  safeParse: (data: any) => {
    const validModes = [
      'social-suggestions', 'people', 'posts', 'energy',
      'recommendations', 'social-proof', 'crowd-intel', 'vibe-match'
    ];
    if (!data.mode || !validModes.includes(data.mode)) {
      return { success: false, error: { format: () => 'Invalid mode' } };
    }
    return { success: true, data };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const input = VenueQuerySchema.safeParse(body);

    if (!input.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid payload', 
        details: input.error.format() 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode, venue_id, user_id, lat, lng, user_vibes = [], limit = 10 } = input.data;

    switch (mode) {
      case 'social-suggestions': {
        // Get social suggestions for the user
        if (!user_id) {
          return new Response(JSON.stringify({ error: 'user_id required for social suggestions' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: suggestions, error: suggestionsError } = await supabase
          .rpc('generate_friend_suggestions', {
            p_user_id: user_id,
            p_user_lat: 0, // placeholder
            p_user_lng: 0, // placeholder
            p_limit: limit
          });

        if (suggestionsError) {
          return new Response(JSON.stringify({ error: 'Failed to get social suggestions' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          suggestions: suggestions || [],
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'people': {
        // Get people list for venue
        if (!venue_id) {
          return new Response(JSON.stringify({ error: 'venue_id required for people list' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: people, error: peopleError } = await supabase
          .from('venue_live_presence')
          .select(`
            profile_id,
            vibe,
            last_heartbeat,
            profiles:profile_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('venue_id', venue_id)
          .gt('expires_at', new Date().toISOString())
          .order('last_heartbeat', { ascending: false })
          .limit(limit);

        if (peopleError) {
          return new Response(JSON.stringify({ error: 'Failed to get venue people' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          people: people || [],
          venue_id,
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'posts': {
        // Get recent posts for venue
        if (!venue_id) {
          return new Response(JSON.stringify({ error: 'venue_id required for posts' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: posts, error: postsError } = await supabase
          .from('venue_feed_posts')
          .select(`
            id,
            content,
            created_at,
            vibe_tag,
            profiles:user_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('venue_id', venue_id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(limit);

        if (postsError) {
          return new Response(JSON.stringify({ error: 'Failed to get venue posts' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          posts: posts || [],
          venue_id,
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'energy': {
        // Get social energy for venue
        if (!venue_id) {
          return new Response(JSON.stringify({ error: 'venue_id required for energy data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current presence from snapshot (fast)
        const { data: snap, error: snapError } = await supabase
          .from('venue_presence_snapshot')
          .select('people_now, dominant_vibe')
          .eq('venue_id', venue_id)
          .single();

        let totalPeople = 0;
        let dominantVibe = 'neutral';
        let vibeDistribution = {};

        if (snap && !snapError) {
          // Use snapshot data (preferred)
          totalPeople = snap.people_now || 0;
          dominantVibe = snap.dominant_vibe || 'neutral';
          // For vibe distribution, fall back to live data
          const { data: presenceData } = await supabase
            .from('venue_live_presence')
            .select('vibe')
            .eq('venue_id', venue_id)
            .gt('expires_at', new Date().toISOString());
          
          vibeDistribution = presenceData?.reduce((acc, p) => {
            acc[p.vibe] = (acc[p.vibe] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
        } else {
          // Fallback to live presence if snapshot not found
          const { data: presenceData, error: presenceError } = await supabase
            .from('venue_live_presence')
            .select('vibe')
            .eq('venue_id', venue_id)
            .gt('expires_at', new Date().toISOString());

          if (presenceError) {
            return new Response(JSON.stringify({ error: 'Failed to get venue energy' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          totalPeople = presenceData?.length || 0;
          vibeDistribution = presenceData?.reduce((acc, p) => {
            acc[p.vibe] = (acc[p.vibe] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          dominantVibe = Object.entries(vibeDistribution)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';
        }

        const energyScore = Math.min(100, totalPeople * 10); // Simple energy calculation

        return new Response(JSON.stringify({ 
          success: true, 
          energy: {
            total_people: totalPeople,
            energy_score: energyScore,
            dominant_vibe: dominantVibe,
            vibe_distribution: vibeDistribution,
            venue_id
          },
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'recommendations': {
        // Get venue recommendations using optimized venue intelligence
        if (!user_id || !lat || !lng) {
          return new Response(JSON.stringify({ 
            error: 'user_id, lat, and lng required for recommendations' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: recommendations, error: recError } = await supabase.functions.invoke('venue-intelligence-v2', {
          body: {
            mode: 'recommendations',
            user_id: user_id,
            lat: lat,
            lng: lng,
            user_vibes: user_vibes,
            limit: limit
          }
        });

        if (recError) {
          return new Response(JSON.stringify({ error: 'Failed to get venue recommendations' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          recommendations: recommendations?.recommendations || [],
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'social-proof': {
        // Get social proof data for venue
        if (!venue_id || !user_id) {
          return new Response(JSON.stringify({ 
            error: 'venue_id and user_id required for social proof' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: socialProof, error: socialError } = await supabase.rpc('get_friend_network_venue_data_safe', {
          p_user_id: user_id,
          p_venue_ids: [venue_id]
        });

        if (socialError) {
          return new Response(JSON.stringify({ error: 'Failed to get social proof data' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const venueData = socialProof?.[0] || {
          venue_id: venue_id,
          friend_visits: 0,
          recent_visitors: [],
          network_rating: 0,
          popular_with: 'New to your network'
        };

        return new Response(JSON.stringify({ 
          success: true, 
          social_proof: venueData,
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'crowd-intel': {
        // Get crowd intelligence data for venue
        if (!venue_id) {
          return new Response(JSON.stringify({ 
            error: 'venue_id required for crowd intelligence' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current presence count
        const { data: currentPresence, error: presenceError } = await supabase
          .from('vibes_now')
          .select('profile_id, vibe, updated_at')
          .eq('venue_id', venue_id)
          .gt('expires_at', new Date().toISOString());

        if (presenceError) {
          return new Response(JSON.stringify({ error: 'Failed to get crowd intelligence' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const currentCount = currentPresence?.length || 0;
        const vibeDistribution = currentPresence?.reduce((acc, p) => {
          acc[p.vibe] = (acc[p.vibe] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Get historical data for trends
        const { data: historicalData, error: histError } = await supabase
          .from('venue_stays')
          .select('arrived_at, departed_at')
          .eq('venue_id', venue_id)
          .gte('arrived_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        // Calculate peak times and capacity estimates
        const hourlyData = new Map<number, number>();
        historicalData?.forEach(stay => {
          const hour = new Date(stay.arrived_at).getHours();
          hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);
        });

        const peakHour = Array.from(hourlyData.entries())
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 20;

        const crowdIntel = {
          current_capacity: Math.min(100, currentCount * 10), // Simple capacity estimation
          predicted_peak: `${peakHour}:00`,
          typical_crowd: currentCount > 10 ? 'Busy crowd' : currentCount > 5 ? 'Moderate crowd' : 'Quiet atmosphere',
          current_count: currentCount,
          vibe_distribution: vibeDistribution,
          best_time_to_visit: peakHour > 12 ? `${peakHour - 2}:00 - ${peakHour}:00` : `${peakHour + 2}:00 - ${peakHour + 4}:00`,
          venue_id: venue_id
        };

        return new Response(JSON.stringify({ 
          success: true, 
          crowd_intelligence: crowdIntel,
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'vibe-match': {
        // Get vibe matching data for venue
        if (!venue_id || !user_id) {
          return new Response(JSON.stringify({ 
            error: 'venue_id and user_id required for vibe matching' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user's behavior patterns
        const { data: userBehavior, error: behaviorError } = await supabase.rpc('get_user_behavior_patterns_safe', {
          p_user_id: user_id
        });

        if (behaviorError) {
          return new Response(JSON.stringify({ error: 'Failed to get user behavior patterns' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get venue data
        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select('id, name, categories, vibe, vibe_score, rating')
          .eq('id', venue_id)
          .single();

        if (venueError) {
          return new Response(JSON.stringify({ error: 'Failed to get venue data' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userPrefs = userBehavior?.[0] || {
          preferred_categories: [],
          social_preference: 'moderate'
        };

        // Calculate vibe match score
        const categoryMatch = venue.categories?.some(cat => 
          userPrefs.preferred_categories?.includes(cat)
        ) ? 0.8 : 0.4;

        const vibeMatch = user_vibes.includes(venue.vibe) ? 0.9 : 0.5;
        const overallScore = (categoryMatch + vibeMatch) / 2;

        const vibeMatchData = {
          score: overallScore,
          explanation: overallScore > 0.7 ? 'Great match for your vibes!' : 
                      overallScore > 0.5 ? 'Good match for your preferences' : 
                      'Might be worth exploring',
          user_vibes: user_vibes,
          venue_vibes: [venue.vibe],
          category_match: categoryMatch,
          vibe_alignment: vibeMatch,
          venue_id: venue_id
        };

        return new Response(JSON.stringify({ 
          success: true, 
          vibe_match: vibeMatchData,
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unhandled venue intelligence mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in get-venue-intelligence function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
