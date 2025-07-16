import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { daily_afterglow_id } = await req.json()
    if (!daily_afterglow_id) throw new Error('daily_afterglow_id required')

    console.log('Creating share link for afterglow:', daily_afterglow_id)

    // Check if link already exists
    const { data: existing } = await supabase
      .from('afterglow_share_links')
      .select('slug')
      .eq('daily_afterglow_id', daily_afterglow_id)
      .maybeSingle()

    if (existing) {
      console.log('Share link already exists:', existing.slug)
      return new Response(
        JSON.stringify({
          slug: existing.slug,
          url: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/a/${existing.slug}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retry loop for slug collisions (rare)
    let row, attempts = 0
    while (attempts < 5 && !row) {
      const { data, error } = await supabase
        .from('afterglow_share_links')
        .insert({ daily_afterglow_id })
        .select('slug')
        .maybeSingle()

      if (!error) { 
        row = data
        console.log('Generated new slug:', row?.slug)
      }
      else if (error.code !== '23505') {
        console.error('Database error:', error)
        throw error  // not unique_violation
      }
      attempts++
    }
    if (!row) throw new Error('Could not generate unique slug')

    // Kick off OG-image render *fire-and-forget*
    try {
      await supabase.functions.invoke('render-og-card', {
        body: { daily_afterglow_id, slug: row.slug }
      })
      console.log('OG card render job queued for slug:', row.slug)
    } catch (err) {
      console.error('Failed to queue OG card render:', err)
      // Don't fail the request if OG card generation fails
    }

    const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://localhost:5173'
    
    return new Response(
      JSON.stringify({
        slug: row.slug,
        url: `${siteUrl}/a/${row.slug}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error creating share link:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})