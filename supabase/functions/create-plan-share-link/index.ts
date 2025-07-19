import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { plan_id } = await req.json()

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: 'plan_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify plan exists and is accessible
    const { data: plan, error: planError } = await supabaseClient
      .from('floq_plans')
      .select('id, title, floq_id')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique slug for the plan share link
    const generateSlug = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }

    let slug = generateSlug()
    
    // Ensure slug is unique (basic collision detection)
    const { data: existingLink } = await supabaseClient
      .from('plan_share_links')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (existingLink) {
      slug = generateSlug() + Date.now().toString().slice(-3)
    }

    // Create or update share link record
    const { data: shareLink, error: insertError } = await supabaseClient
      .from('plan_share_links')
      .upsert({
        plan_id: plan_id,
        slug: slug,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating share link:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create share link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const baseUrl = 'https://11986cc9-7473-4e33-83dd-acd244d83d3e.lovableproject.com'
    const shareUrl = `${baseUrl}/plan/${slug}`

    return new Response(
      JSON.stringify({
        slug: slug,
        url: shareUrl,
        plan_title: plan.title,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-plan-share-link function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})