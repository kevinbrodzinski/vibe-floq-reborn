import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface SyncPlanChangesParams {
  plan_id: string
  changes: {
    type: 'reorder_stops' | 'update_stop' | 'presence_update'
    data: any
  }
}

export function usePlanSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: SyncPlanChangesParams) => {
      const { data, error } = await supabase.functions.invoke('sync-plan-changes', {
        body: params
      })
      
      if (error) {
        console.error('Plan sync error:', error)
        throw new Error(error.message || 'Failed to sync plan changes')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries based on change type
      if (variables.changes.type === 'reorder_stops' || variables.changes.type === 'update_stop') {
        queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
        queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      }
    },
    onError: (error) => {
      console.error('Plan sync failed:', error)
    }
  })
}