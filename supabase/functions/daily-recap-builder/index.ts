import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    console.log('Daily recap builder started')

    // Get users who were active yesterday (have raw_locations)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000)
    
    const { data: activeUsers, error: usersError } = await admin
      .from('raw_locations')
      .select('user_id')
      .gte('captured_at', twoDaysAgo.toISOString())
      .lte('captured_at', yesterday.toISOString())
      .neq('user_id', null)
      .limit(10000) // safeguard

    if (usersError) {
      console.error('Error fetching active users:', usersError)
      throw usersError
    }

    const uniqueUsers = [...new Set((activeUsers || []).map(u => u.user_id))]
    const targetDay = yesterday.toISOString().slice(0, 10) // yyyy-mm-dd

    console.log(`Processing ${uniqueUsers.length} users for ${targetDay}`)

    let processed = 0
    for (const userId of uniqueUsers) {
      try {
        // Call the build_daily_recap function
        const { data: payload, error: recapError } = await admin.rpc('build_daily_recap', {
          uid: userId,
          d: targetDay
        })

        if (recapError) {
          console.error(`Error building recap for user ${userId}:`, recapError)
          continue
        }

        // Upsert into cache
        const { error: upsertError } = await admin
          .from('daily_recap_cache')
          .upsert({ 
            user_id: userId, 
            day: targetDay, 
            payload 
          })

        if (upsertError) {
          console.error(`Error upserting recap for user ${userId}:`, upsertError)
          continue
        }

        processed++
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error)
      }
    }

    console.log(`Successfully processed ${processed}/${uniqueUsers.length} recaps`)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        date: targetDay,
        totalUsers: uniqueUsers.length,
        processed 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Daily recap builder error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        ok: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})