import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  const { venue_id, limit = 20 } = await req.json();
  if (!venue_id)
    return new Response(JSON.stringify({ error: 'venue_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  try {
    console.log('Getting recent posts for venue:', venue_id);

    const { data, error } = await supabase
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
      .eq('venue_id', venue_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(+limit);

    if (error) {
      console.error('Error fetching venue posts:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${data?.length || 0} recent posts for venue`);

    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-venue-recent-posts:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});