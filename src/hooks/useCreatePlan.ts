// src/hooks/useCreatePlan.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useSession } from '@/hooks/useSession'

/* ---------- Types ---------- */
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
  /* wizard step-1/2 data */
  title: string
  description?: string
  vibe_tag?: string
  start: string
  end: string

  /* step-3 data */
  floqSelections: FloqSelection[]
  combinedName: string | null
  invitedUserIds: string[]

  /* locals, derived – not passed to RPC */
  duration_hours?: number
}

/* ---------- Hook ---------- */
export function useCreatePlan() {
  const qc        = useQueryClient()
  const { session } = useSession()

  return useMutation({
    /* -------------- INSERT shell – returns the new plan id -------------- */
    mutationFn: async (payload: CreatePlanPayload) => {
      if (!session?.user?.id) throw new Error('Not signed in')

      /* 1️⃣  create plan shell – no floq linkage yet */
      const { data: planData, error: planErr } = await supabase
        .from('floq_plans')
        .insert({
          title:       payload.title,
          description: payload.description ?? null,
          vibe_tag:    payload.vibe_tag ?? null,
          planned_at:  payload.start,
          start_time:  payload.start.slice(11, 19), // ISO → HH:MM:SS
          end_time:    payload.end.slice(11, 19),
          creator_id:  session.user.id,
          plan_mode:   'draft'
        })
        .select('id')
        .single()

      if (planErr) throw planErr

      /* 2️⃣  hand off to RPC for finalisation / floq plumbing */
      const { error: rpcErr } = await supabase.rpc('finalize_plan', {
        _plan_id:    planData.id,
        _selections: payload.floqSelections,
        _creator:    session.user.id,
        _invited_ids: payload.invitedUserIds.length
          ? payload.invitedUserIds
          : null
      })

      if (rpcErr) {
        console.error('finalize_plan failed', rpcErr)
        throw rpcErr
      }

      /* 3️⃣  invalidate caches so UI refreshes */
      qc.invalidateQueries(['plans', session.user.id])
      qc.invalidateQueries(['floqs', session.user.id])

      toast.success('Plan created!')
      return planData          // contains { id }
    },

    onError(err: any) {
      toast.error(err.message ?? 'Failed to create plan')
    }
  })
}