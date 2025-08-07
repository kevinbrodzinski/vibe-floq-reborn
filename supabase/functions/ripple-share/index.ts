import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,   // ⬅ service role
      { auth: { persistSession: false } }
    );

    const { user_id, afterglow_id } = await req.json();

    if (!user_id || !afterglow_id) {
      return new Response('Missing required fields', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Create share link for afterglow
    const { data, error } = await supabase
      .from('afterglow_share_links')
      .insert({ 
        daily_afterglow_id: afterglow_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating share link:', error);
      return new Response(error.message, { 
        status: 500,
        headers: corsHeaders 
      });
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        data,
        share_url: `${Deno.env.get('SITE_URL') || 'http://localhost:8080'}/ripple/share/${data.slug}`
      }), 
      {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );

  } catch (error) {
    console.error('Error in ripple-share function:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});