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

    const { planId, selections, combinedName }: { 
      planId: string; 
      selections: Selection[]; 
      combinedName?: string 
    } = await req.json()

    const userId = user.id

    console.log('Processing Floq links for plan:', planId, 'selections:', selections, 'combinedName:', combinedName)

    const existing = selections.filter((s): s is SelectionExisting => s.type === 'existing')
    const newNamed = selections.filter((s): s is SelectionNew => s.type === 'new')

    // Case C: Zero floqs selected (solo plan)
    if (!existing.length && !newNamed.length) {
      console.log('Case C: Solo plan, no floqs to link')
      return new Response(JSON.stringify({ ok: true }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Case A: Single existing floq
    if (existing.length === 1 && !combinedName && !newNamed.length) {
      console.log('Case A: Single existing floq')
      const { error: linkErr } = await supabase
        .from('plan_floqs')
        .insert({
          plan_id: planId,
          floq_id: existing[0].floqId,
          auto_disband: existing[0].autoDisband,
        })
      
      throwIf(linkErr, 'Failed to link existing floq to plan')
      
      console.log('Successfully linked existing floq to plan:', planId)
      return new Response(JSON.stringify({ ok: true }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Case B: Multiple floqs or new floqs (need to create new floqs)
    console.log('Case B: Creating new floqs and linking')
    const createdIds: string[] = []

    // 1. Create every "new" floq the user typed
    for (const newFloq of newNamed) {
      const { data: created, error: createErr } = await supabase
        .from('floqs')
        .insert({
          id: nanoid(),
          title: newFloq.name,
          description: 'Created for plan',
          creator_id: userId,
          location: 'POINT(0 0)',
          primary_vibe: 'social',
          visibility: 'private',
          flock_type: 'momentary'
        })
        .select('id')
        .single()
      
      throwIf(createErr, `Failed to create new floq: ${newFloq.name}`)
      
      if (created) {
        createdIds.push(created.id)
        
        // Add creator as participant
        const { error: participantErr } = await supabase
          .from('floq_participants')
          .insert({
            floq_id: created.id,
            user_id: userId,
            role: 'creator'
          })
        
        throwIf(participantErr, 'Failed to add creator as participant')
      }
    }

    // 2. If combinedName present → create super floq
    let superId: string | undefined
    if (combinedName) {
      const { data: superFloq, error: superErr } = await supabase
        .from('floqs')
        .insert({
          id: nanoid(),
          title: combinedName,
          description: 'Combined floq for plan',
          creator_id: userId,
          location: 'POINT(0 0)',
          primary_vibe: 'social',
          visibility: 'private',
          flock_type: 'momentary'
        })
        .select('id')
        .single()
      
      throwIf(superErr, 'Failed to create super floq')
      
      if (superFloq) {
        superId = superFloq.id
        createdIds.push(superId)
        
        // Add creator as participant
        const { error: participantErr } = await supabase
          .from('floq_participants')
          .insert({
            floq_id: superId,
            user_id: userId,
            role: 'creator'
          })
        
        throwIf(participantErr, 'Failed to add creator as participant to super floq')
      }
    }

    // 3. Link everything that now exists
    const allIds = [
      ...existing.map(e => e.floqId),
      ...createdIds
    ]

    const links = allIds.map(floqId => ({
      plan_id: planId,
      floq_id: floqId,
      auto_disband: false // Set based on your logic
    }))

    const { error: linkErr } = await supabase
      .from('plan_floqs')
      .upsert(links, { onConflict: 'plan_id,floq_id' })
    
    throwIf(linkErr, 'Failed to link floqs to plan')

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