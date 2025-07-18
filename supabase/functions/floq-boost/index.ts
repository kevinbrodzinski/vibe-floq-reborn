
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, respondWithCors } from '../_shared/cors.ts'

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
      return respondWithCors({ error: 'Unauthorized' }, 401)
    }

    // Use service role key for database operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      // No auth headers - service role bypasses RLS
    )

    const { floq_id, action, boost_type = 'vibe' }: BoostRequest = await req.json()

    if (!floq_id || !action) {
      return respondWithCors({ error: 'Missing required fields: floq_id, action' }, 400)
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
        return respondWithCors({ error: 'Rate limit exceeded: maximum 60 boosts per hour' }, 429)
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
        return respondWithCors({ error: error.message }, 400)
      }

      return respondWithCors({ success: true, boost: data })
    } else if (action === 'unboost') {
      // Remove boost
      const { error } = await supabase
        .from('floq_boosts')
        .delete()
        .match({ floq_id, user_id: user.id, boost_type })

      if (error) {
        console.error('Unboost error:', error)
        return respondWithCors({ error: error.message }, 400)
      }

      return respondWithCors({ success: true })
    }

    return respondWithCors({ error: 'Invalid action' }, 400)

  } catch (error) {
    console.error('Function error:', error)
    return respondWithCors({ error: 'Internal server error' }, 500)
  }
})
