import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { nanoid } from 'https://esm.sh/nanoid@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface SelectionExisting {
  type: 'existing'
  floqId: string
  autoDisband: boolean
}

interface SelectionNew {
  type: 'new'
  name: string
  autoDisband: boolean
}

type Selection = SelectionExisting | SelectionNew

// Error helper
function throwIf(error: any, message?: string) {
  if (error) {
    console.error(message || 'Database error:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get user from JWT instead of request body (security fix)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { planId, selections }: { planId: string; selections: Selection[] } =
      await req.json()

    const userId = user.id

    console.log('Processing Floq links for plan:', planId, 'selections:', selections)

    /* Step 1 — create any NEW floqs */
    const newSelections = selections.filter((s): s is SelectionNew => s.type === 'new')
    const createdIds: Record<string, string> = {}

    if (newSelections.length) {
      const rows = newSelections.map((s) => ({
        id: nanoid(),
        title: s.name,
        description: `Created for plan`,
        creator_id: userId,
        location: 'POINT(0 0)', // Default location
        primary_vibe: 'social',
        visibility: 'private',
        flock_type: 'momentary'
      }))
      
      const { data: createdFloqs, error: newErr } = await supabase
        .from('floqs')
        .insert(rows)
        .select('id, title')
      
      throwIf(newErr, 'Failed to create new floqs')
      
      // Map created floqs by name
      newSelections.forEach((selection, idx) => {
        if (createdFloqs && createdFloqs[idx]) {
          createdIds[selection.name] = createdFloqs[idx].id
        }
      })

      // Add creator as participant to new floqs
      if (createdFloqs) {
        const participantRows = createdFloqs.map(floq => ({
          floq_id: floq.id,
          user_id: userId,
          role: 'creator'
        }))
        
        const { error: participantErr } = await supabase.from('floq_participants').insert(participantRows)
        throwIf(participantErr, 'Failed to add creator as participant')
      }
    }

    /* Step 2 — upsert into plan_floqs */
    const links = selections.map((s) => ({
      plan_id: planId,
      floq_id: s.type === 'existing' ? s.floqId : createdIds[s.name],
      auto_disband: s.autoDisband,
    }))

    const { error: linkErr } = await supabase
      .from('plan_floqs')
      .upsert(links, { onConflict: 'plan_id,floq_id' })
    
    throwIf(linkErr, 'Failed to link floqs to plan')

    /* Step 3 — add all plan participants to these floqs */
    const { data: participants } = await supabase
      .from('plan_participants')
      .select('user_id')
      .eq('plan_id', planId)

    if (participants && participants.length > 0) {
      const memberRows = links.flatMap((l) =>
        participants.map((p) => ({
          floq_id: l.floq_id,
          user_id: p.user_id,
          role: 'member'
        }))
      )

      if (memberRows.length) {
        const { error: memberErr } = await supabase
          .from('floq_participants')
          .upsert(memberRows, {
            onConflict: 'floq_id,user_id',
            ignoreDuplicates: true,
          })
        
        throwIf(memberErr, 'Failed to add participants to floqs')
      }
    }

    console.log('Successfully processed Floq links for plan:', planId)
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('Error in ensure_floq_links:', e)
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})