
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VenueQuerySchema = {
  safeParse: (data: any) => {
    const validModes = ['social-suggestions', 'people', 'posts', 'energy'];
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

    const { mode, venue_id, user_id, limit = 10 } = input.data;

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
            user_id,
            vibe,
            last_heartbeat,
            profiles:user_id (
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

        // Get current presence count
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

        // Calculate energy metrics
        const totalPeople = presenceData?.length || 0;
        const vibeDistribution = presenceData?.reduce((acc, p) => {
          acc[p.vibe] = (acc[p.vibe] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const dominantVibe = Object.entries(vibeDistribution)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';

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
