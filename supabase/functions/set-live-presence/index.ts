import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } }
    );

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await anon.auth.getUser(jwt);
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const { on = true, duration_min = 60 } = body;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const payload = on
      ? { is_live: true, ends_at: null }
      : { is_live: false, ends_at: new Date(Date.now() + duration_min * 60 * 1000).toISOString() };

    await admin.from('friend_share_pref')
      .upsert({ profile_id: user.id, ...payload }, { onConflict: 'profile_id' });

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in set-live-presence:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});