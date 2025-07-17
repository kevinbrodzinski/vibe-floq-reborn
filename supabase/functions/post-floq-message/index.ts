import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject()

serve(async (req) => {
  // ---------- 1. pre-flight ----------
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: cors() })

  // ---------- 2. verify jwt ----------
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return resp(401, 'missing bearer')

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const { data: user, error: jwtErr } = await supabase.auth.getUser()
  if (jwtErr || !user) return resp(401, 'invalid jwt')

  // ---------- 3. payload ----------
  const { floq_id, body } = await req.json()
  if (!floq_id || !body) return resp(400, 'floq_id & body required')

  // ---------- 4. membership check ----------
  const { count } = await supabase
    .from('floq_participants')
    .select('*', { count: 'exact', head: true })
    .eq('floq_id', floq_id)
    .eq('user_id', user.id)

  if (!count) return resp(403, 'not a member')

  // ---------- 5. insert ----------
  const { data, error } = await supabase
    .from('floq_messages')
    .insert({ floq_id, sender_id: user.id, body })
    .select()
    .single()

  if (error) return resp(500, error.message)
  return new Response(JSON.stringify(data), { headers: cors() })
})

function cors() {
  return { 'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
}
function resp(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: cors() })
}