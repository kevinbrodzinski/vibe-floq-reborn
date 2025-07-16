// Phase 10: Real-Time Stop Planning + Voting UI

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useCallback } from 'react'

interface StopChangePayload {
  data: {
    action: 'add' | 'update' | 'delete'
    stop: any
  }
}

interface SyncPayload {
  plan_id: string
  changes: StopChangePayload
}

// 1. Broadcast Stop Updates
export function usePlanSync(planId?: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (params: any) => {
      // Legacy edge function call
      const { data, error } = await supabase.functions.invoke('sync-plan-changes', {
        body: params
      })
      
      if (error) {
        console.error('Plan sync error:', error)
        const message = error?.message ?? error?.error?.message ?? 'Something went wrong on the server'
        throw new Error(message)
      }

      // If planId is provided, also broadcast
      if (planId && params.changes) {
        const channel = supabase.channel(`plan-${planId}`)
        channel.send({
          type: 'broadcast',
          event: 'stop_updated',
          payload: params.changes
        })
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries based on change type
      if (variables.changes?.type === 'reorder_stops' || variables.changes?.type === 'update_stop' || variables.changes?.type === 'delete_stop') {
        queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
        queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      }
    },
    onError: (error) => {
      console.error('Plan sync failed:', error)
    }
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    ...mutation
  }
}