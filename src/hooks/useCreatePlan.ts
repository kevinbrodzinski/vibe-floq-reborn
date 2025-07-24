import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useSession } from '@/hooks/useSession'
import { to24h } from '@/utils/parseLocalTime'

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

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

export interface CreatePlanPayload {
  title: string
  description?: string
  vibe_tag?: string
  start: string           // “18:00”
  end: string             // “22:00”
  invitedUserIds: string[]
  floqSelections: FloqSelection[]
  combinedName?: string   // only when >1 selection
}

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

const isoToPgTime = (iso: string) => iso.slice(11, 19) // HH:MM:SS

/* ──────────────────────────────────────────────────────────
   Hook
   ────────────────────────────────────────────────────────── */

export function useCreatePlan() {
  const session = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      if (!session?.user) throw new Error('not-signed-in')

      /* 1 ─ draft row in floq_plans --------------------------------------- */
      const primaryVibe = validVibes.includes(
        payload.vibe_tag?.toLowerCase() as any
      )
        ? (payload.vibe_tag!.toLowerCase() as (typeof validVibes)[number])
        : 'chill'

      const todayISO = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const startISO = new Date(`${todayISO}T${to24h(payload.start)}:00Z`)
        .toISOString()
      const endISO = new Date(`${todayISO}T${to24h(payload.end)}:00Z`)
        .toISOString()

      const { data: planRow, error: planErr } = await supabase
        .from('floq_plans')
        .insert({
          title: payload.title,
          description: payload.description,
          vibe_tag: primaryVibe,
          planned_at: startISO,
          start_time: isoToPgTime(startISO),
          end_time: isoToPgTime(endISO),
          creator_id: session.user.id,
          plan_mode: 'draft',
        })
        .select('id')
        .single()

      if (planErr) throw planErr
      const planId = planRow.id as string

      /* 2 ─ call finalize_plan RPC (Phase 2) ------------------------------ */
      const { error: finalizeErr } = await supabase.rpc('finalize_plan', {
        _plan_id: planId,
        _selections: payload.floqSelections,
        _creator: session.user.id,
      })

      if (finalizeErr) {
        console.error(finalizeErr)
        throw new Error('Failed to link Floqs / finalise plan')
      }

      /* 3 ─ send plan invites (adds participants to plan) ----------------- */
      if (payload.invitedUserIds.length) {
        const { error: inviteErr } = await supabase.rpc('invite_friends', {
          p_plan_id: planId,
          p_user_ids: payload.invitedUserIds,
        })
        if (inviteErr) {
          // non-fatal – plan is finalised, only invites failed
          console.warn(inviteErr)
          toast.error('Plan saved, but some invites failed.')
        }
      }

      return { id: planId }
    },

    onSuccess: () => {
      toast.success('Plan created!')
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
    },

    onError: (err: unknown) => {
      console.error(err)
      toast.error('Could not create plan – please try again.')
    },
  })
}