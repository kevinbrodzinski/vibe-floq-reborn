import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { venueId } = await req.json();

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: 'Venue ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Getting recent posts for venue:', venueId);

    // Get recent posts from this venue with user profiles
    const { data: venuePosts, error: postsError } = await supabaseClient
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
        profiles!inner (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('venue_id', venueId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (postsError) {
      console.error('Error fetching venue posts:', postsError);
      throw postsError;
    }

    console.log(`Found ${venuePosts?.length || 0} recent posts for venue`);

    return new Response(
      JSON.stringify(venuePosts || []),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-venue-recent-posts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});