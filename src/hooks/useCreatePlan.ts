import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useSession } from '@/hooks/useSession'
import { to24h } from '@/utils/parseLocalTime'

/** Convert ISO to hh:mm:ss for Postgres TIME columns */
const isoToPgTime = (iso: string) => iso.slice(11, 19)  // '2025-07-17T07:00:00.000Z' -> '07:00:00'

const validVibes = [
  'social',
  'chill', 
  'hype',
  'curious',
  'solo',
  'romantic',
  'weird',
  'down',
  'flowing',
  'open',
] as const

export type SelectionExisting = {
  type: 'existing'
  floqId: string
  name: string
  autoDisband: boolean
}

export type SelectionNew = {
  type: 'new'
  name: string
  autoDisband: boolean
}

export type FloqSelection = SelectionExisting | SelectionNew

interface CreatePlanPayload {
  title: string
  description?: string
  vibe_tag?: string
  start: string
  end: string
  invitedUserIds: string[]
  floqSelections: FloqSelection[]
  combinedName?: string | null
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  const currentSession = useSession()

  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      if (!currentSession?.user) throw new Error('not-signed-in')
      
      // Map vibe_tag to valid enum value
      const primaryVibe = validVibes.includes(payload.vibe_tag?.toLowerCase() as any) 
        ? payload.vibe_tag.toLowerCase() as typeof validVibes[number]
        : 'chill'

      // Convert 12-hour time to ISO strings
      const today = new Date().toISOString().slice(0, 10)
      const startISO = new Date(`${today}T${to24h(payload.start)}:00Z`).toISOString()
      const endISO = new Date(`${today}T${to24h(payload.end)}:00Z`).toISOString()

      // Create the plan (no floq_id yet - will be linked via edge function)
      const { data: planData, error: planError } = await supabase
        .from('floq_plans')
        .insert({
          title: payload.title,
          description: payload.description,
          vibe_tag: primaryVibe,
          planned_at: startISO,
          start_time: isoToPgTime(startISO),
          end_time: isoToPgTime(endISO),
          creator_id: currentSession.user.id,
          plan_mode: 'draft'
        })
        .select('id')
        .single()

      if (planError) throw planError

      // Get current session and pass authorization header explicitly  
      const { data: { session } } = await supabase.auth.getSession()
      
      // Edge function -> create/link floqs, merge members
      const { error: linkError } = await supabase.functions.invoke('ensure_floq_links', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {},
        body: {
          planId: planData.id,
          selections: payload.floqSelections,
          combinedName: payload.combinedName
        }
      })

      if (linkError) {
        console.error('Failed to link floqs:', linkError)
        throw new Error('Failed to link floqs to plan')
      }

      // Send invitations if there are any
      if (payload.invitedUserIds && payload.invitedUserIds.length > 0) {
        const { error: inviteError } = await supabase.rpc('invite_friends', {
          p_plan_id: planData.id,
          p_user_ids: payload.invitedUserIds
        })

        if (inviteError) {
          console.error('Failed to send invitations:', inviteError)
          // Don't throw here - plan was created successfully, just invites failed
          toast.error('Plan created but failed to send some invitations')
        }
      }

      return planData
    },
    onSuccess: (planData) => {
      toast.success('Plan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
    },
    onError: (error) => {
      console.error('Failed to create plan:', error)
      toast.error('Failed to create plan. Please try again.')
    }
  })
}
