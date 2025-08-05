import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toastError, toastSuccess } from '@/lib/toast'

export interface AddPlanStopPayload {
  plan_id: string
  title: string
  description?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  venue_id?: string | null
  estimated_cost_per_person?: number | null
}

/**
 * Server-side ordering – call the RPC instead of direct insert
 */
export async function addPlanStopRPC(payload: AddPlanStopPayload) {
  const { data, error } = await supabase.rpc('add_plan_stop_with_order', {
    p_plan_id: payload.plan_id,
    p_title: payload.title,
    p_description: payload.description ?? null,
    p_start_time: payload.start_time ?? null,
    p_end_time: payload.end_time ?? null,
    p_duration_minutes: payload.duration_minutes ?? 60,
    p_venue_id: payload.venue_id ?? null,
    p_estimated_cost: payload.estimated_cost_per_person ?? null
  })

  if (error) {
    console.error('RPC Error:', error)
    throw error
  }
  
  return { id: data as string }
}

/**
 * Delete stop RPC for consistent backend handling
 */
export async function deletePlanStopRPC(stopId: string) {
  const { error } = await supabase
    .from('plan_stops')
    .delete()
    .eq('id', stopId)

  if (error) {
    console.error('Delete Error:', error)
    throw error
  }
}

/**
 * Optimistic local state management hook
 */
export function useOptimisticStops(initialStops: any[] = []) {
  const [localStops, setLocalStops] = useState(initialStops)

  const optimisticAdd = async (payload: AddPlanStopPayload) => {
    // ADD with optimistic update
    const optimisticId = crypto.randomUUID()
    const optimistic = { ...payload, id: optimisticId }
    setLocalStops(cur => [...cur, optimistic])

    try {
      const { id: realId } = await addPlanStopRPC(payload)
      // swap temp id with real id
      setLocalStops(cur => cur.map(s => (s.id === optimisticId ? { ...s, id: realId } : s)))
      toastSuccess('Stop added')
    } catch (err) {
      setLocalStops(cur => cur.filter(s => s.id !== optimisticId))  // rollback
      toastError('Failed to add stop', (err as Error).message)
      throw err
    }
  }

  const optimisticDelete = async (stopId: string) => {
    // DELETE with optimistic update
    const originalStops = localStops
    setLocalStops(cur => cur.filter(s => s.id !== stopId))
    
    try {
      await deletePlanStopRPC(stopId)
      toastSuccess('Stop deleted')
    } catch (err) {
      // Rollback to original state
      setLocalStops(originalStops)
      toastError('Failed to delete stop', (err as Error).message)
    }
  }

  return {
    localStops,
    setLocalStops,
    optimisticAdd,
    optimisticDelete
  }
}