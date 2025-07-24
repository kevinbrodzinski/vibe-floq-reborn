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

    const targetDay = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10) // yyyy-mm-dd
    
    // Check if we've already processed recaps for this day
    const { count: existingCount } = await admin
      .from('daily_recap_cache')
      .select('*', { count: 'exact', head: true })
      .eq('day', targetDay)

    if (existingCount && existingCount > 0) {
      console.log(`Recaps for ${targetDay} already exist (${existingCount} users), skipping`)
      return new Response(
        JSON.stringify({ 
          ok: true, 
          date: targetDay,
          message: 'Already processed',
          existing: existingCount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use keyset pagination to get all active users efficiently
    let allUsers: string[] = []
    let lastUserId = ''
    let hasMore = true
    const batchSize = 5000

    while (hasMore) {
      const query = admin
        .from('raw_locations')
        .select('user_id')
        .gte('captured_at', `${targetDay}T00:00:00Z`)
        .lte('captured_at', `${targetDay}T23:59:59Z`)
        .neq('user_id', null)
        .order('user_id')
        .limit(batchSize)

      if (lastUserId) {
        query.gt('user_id', lastUserId)
      }

      const { data: batchUsers, error: usersError } = await query

      if (usersError) {
        console.error('Error fetching active users:', usersError)
        throw usersError
      }

      if (!batchUsers || batchUsers.length === 0) {
        hasMore = false
        break
      }

      const uniqueBatchUsers = [...new Set(batchUsers.map(u => u.user_id))]
      allUsers.push(...uniqueBatchUsers)
      
      if (batchUsers.length < batchSize) {
        hasMore = false
      } else {
        lastUserId = batchUsers[batchUsers.length - 1].user_id
      }
    }

    console.log(`Processing ${allUsers.length} users for ${targetDay}`)

    // Process users in parallel batches
    const concurrency = 20
    let processed = 0
    let errors = 0

    for (let i = 0; i < allUsers.length; i += concurrency) {
      const batch = allUsers.slice(i, i + concurrency)
      
      const promises = batch.map(async (userId) => {
        try {
          // Check if recap already exists for this user
          const { data: existing } = await admin
            .from('daily_recap_cache')
            .select('user_id')
            .eq('user_id', userId)
            .eq('day', targetDay)
            .maybeSingle()

          if (existing) {
            return { success: true, skipped: true }
          }

          // Call the build_daily_recap function
          const { data: payload, error: recapError } = await admin.rpc('build_daily_recap', {
            uid: userId,
            d: targetDay
          })

          if (recapError) {
            console.error(`Error building recap for user ${userId}:`, recapError)
            return { success: false, error: recapError }
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
            return { success: false, error: upsertError }
          }

          return { success: true }
        } catch (error) {
          console.error(`Failed to process user ${userId}:`, error)
          return { success: false, error }
        }
      })

      const results = await Promise.all(promises)
      
      results.forEach(result => {
        if (result.success) {
          processed++
        } else {
          errors++
        }
      })

      // Small delay between batches to avoid overwhelming the DB
      if (i + concurrency < allUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Successfully processed ${processed}/${allUsers.length} recaps (${errors} errors)`)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        date: targetDay,
        totalUsers: allUsers.length,
        processed,
        errors
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