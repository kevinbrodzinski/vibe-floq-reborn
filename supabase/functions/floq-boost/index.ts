import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BoostRequest {
  floq_id: string;
  action: 'boost' | 'unboost';
  boost_type?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT first (using anon key)
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role key for database operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      // No auth headers - service role bypasses RLS
    )

    const { floq_id, action, boost_type = 'vibe' }: BoostRequest = await req.json()

    if (!floq_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: floq_id, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`${action} boost for floq ${floq_id} by user ${user.id}`)

    if (action === 'boost') {
      // Rate limiting: Check boost count in last hour
      const { count } = await supabase
        .from('floq_boosts')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

      if (count! >= 60) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded: maximum 60 boosts per hour' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Add boost
      const { data, error } = await supabase
        .from('floq_boosts')
        .insert({
          floq_id,
          user_id: user.id,
          boost_type,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        })
        .select()
        .single()

      if (error) {
        console.error('Boost error:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, boost: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'unboost') {
      // Remove boost
      const { error } = await supabase
        .from('floq_boosts')
        .delete()
        .match({ floq_id, user_id: user.id, boost_type })

      if (error) {
        console.error('Unboost error:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})