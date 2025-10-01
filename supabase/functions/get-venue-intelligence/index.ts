
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";
import { VenueIntelSchema, parseJson } from "../_shared/zod.ts";

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { 
    status, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonRes(405, { error: 'Method not allowed' });

  try {
    // Auth check with anon client
    const auth = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: auth ? { Authorization: auth } : {} } }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonRes(401, { error: 'Unauthorized' });

    // Validate input
    const json = await req.json().catch(() => null);
    const parsed = parseJson(VenueIntelSchema, json);
    if (parsed.error) return parsed.error;

    const { mode, venue_id, user_id, limit } = parsed.data;

    switch (mode) {
      case 'social-suggestions': {
        if (!user_id) return jsonRes(400, { error: 'user_id required for social suggestions' });

        const { data: suggestions, error: suggestionsError } = await supabase
          .rpc('generate_friend_suggestions', {
            p_user_id: user_id,
            p_user_lat: 0, // placeholder
            p_user_lng: 0, // placeholder
            p_limit: limit
          });

        if (suggestionsError) return jsonRes(500, { error: 'Failed to get social suggestions' });

        return new Response(JSON.stringify({ 
          success: true, 
          suggestions: suggestions || [],
          mode 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'people': {
        if (!venue_id) return jsonRes(400, { error: 'venue_id required for people list' });

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

        if (peopleError) return jsonRes(500, { error: 'Failed to get venue people' });

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
        if (!venue_id) return jsonRes(400, { error: 'venue_id required for posts' });

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

        if (postsError) return jsonRes(500, { error: 'Failed to get venue posts' });

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
        if (!venue_id) return jsonRes(400, { error: 'venue_id required for energy data' });

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

          if (presenceError) return jsonRes(500, { error: 'Failed to get venue energy' });

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

      default:
        return jsonRes(400, { error: 'Unhandled venue intelligence mode' });
    }

  } catch (error) {
    console.error('[venue-intelligence]', error);
    return jsonRes(500, { error: error.message });
  }
});
