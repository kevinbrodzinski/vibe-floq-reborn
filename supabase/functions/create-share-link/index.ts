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

    // Improved site URL derivation with SITE_URL env var
    const siteUrl = Deno.env.get('SITE_URL') ?? 
      `https://${Deno.env.get('SUPABASE_URL')?.replace('https://','').replace('.supabase.co','')}.supabase.co`

    if (existing) {
      console.log('Share link already exists:', existing.slug)
      return new Response(
        JSON.stringify({
          slug: existing.slug,
          url: `${siteUrl}/a/${existing.slug}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the safe database helper function instead of retry loop
    const { data: slug, error: insertError } = await supabase
      .rpc('insert_share_link_safe', { p_afterglow_id: daily_afterglow_id })

    if (insertError) {
      console.error('Database error:', insertError)
      throw insertError
    }

    console.log('Generated new slug:', slug)

    // Kick off OG-image render using fetch instead of invoke
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    try {
      await fetch(`${supabaseUrl}/functions/v1/render-og-card`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${supabaseServiceKey}` 
        },
        body: JSON.stringify({ daily_afterglow_id, slug })
      })
      console.log('OG card render job queued for slug:', slug)
    } catch (err) {
      console.error('Failed to queue OG card render:', err)
      // Don't fail the request if OG card generation fails
    }
    
    return new Response(
      JSON.stringify({
        slug,
        url: `${siteUrl}/a/${slug}`
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