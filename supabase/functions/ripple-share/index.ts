import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { RippleShareSchema, parseJson } from "../_shared/zod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonRes(405, { error: 'Method not allowed' });
  }

  try {
    // Use anon client with auth for user-invoked operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    );

    // Validate auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return jsonRes(401, { error: 'Unauthorized' });
    }

    // Parse and validate request body
    const body = await req.json().catch(() => null);
    const parsed = parseJson(RippleShareSchema, body, corsHeaders);
    if (parsed.error) return parsed.error;

    const { afterglow_id, user_id } = parsed.data;

    console.log(`[ripple-share] Creating share link for afterglow ${afterglow_id}`);

    // Create share link for afterglow (RLS will enforce ownership)
    const { data, error } = await supabase
      .from('afterglow_share_links')
      .insert({ 
        daily_afterglow_id: afterglow_id,
        created_by: user_id || user.id
      })
      .select()
      .single();

    if (error) {
      console.error('[ripple-share] Database error:', error);
      return jsonRes(500, { error: 'Failed to create share link' });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:8080';
    const shareUrl = `${siteUrl}/ripple/share/${data.slug}`;

    console.log(`[ripple-share] Created share link: ${shareUrl}`);

    return jsonRes(200, { 
      success: true,
      data,
      share_url: shareUrl
    });

  } catch (error) {
    console.error('[ripple-share] Unexpected error:', error);
    return jsonRes(500, { error: 'Internal server error' });
  }
});
