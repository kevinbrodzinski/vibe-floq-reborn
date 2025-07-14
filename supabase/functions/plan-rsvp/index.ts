import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  plan_id: string
  join: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()

    // Use anon key with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!
          }
        }
      }
    )

    // Call the RPC function we created in the migration
    const { data, error } = await supabase
      .rpc('join_or_leave_plan', { 
        p_plan_id: body.plan_id, 
        p_join: body.join 
      })

    if (error) {
      console.error('Error with plan RSVP:', error)
      return new Response(error.message, { status: 400, headers: corsHeaders })
    }

    // Wrap response to ensure success field
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in plan-rsvp:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})