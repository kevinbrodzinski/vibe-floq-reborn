import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  floq_id: string
  title?: string | null
  description?: string | null
  pinned_note?: string | null
  visibility?: 'public' | 'private'
  max_participants?: number | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Use anon client with bearer header (fix for service role auth issue)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.pinned_note !== undefined) {
      updateData.pinned_note = body.pinned_note?.trim() || null
    }
    if (body.title !== undefined) {
      updateData.title = body.title
    }
    if (body.description !== undefined) {
      updateData.description = body.description
    }
    if (body.visibility !== undefined) {
      updateData.visibility = body.visibility
    }
    if (body.max_participants !== undefined) {
      updateData.max_participants = body.max_participants
    }

    // Update the floq (RLS will ensure only creator can update)
    const { error } = await supabase
      .from('floqs')
      .update(updateData)
      .eq('id', body.floq_id)
      .eq('creator_id', user.id) // Additional safety check

    if (error) {
      console.error('Error updating floq:', error)
      return new Response(error.message, { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in update-floq-settings:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})