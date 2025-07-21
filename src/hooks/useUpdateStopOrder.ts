
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ReorderStopsParams {
  planId: string
  stopOrders: Array<{ id: string; stop_order: number }>
}

interface LegacyUpdateStopOrderParams {
  planId: string
  stopId: string
  newOrder: number
}

export function useReorderPlanStops() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ planId, stopOrders }: ReorderStopsParams) => {
      const { error } = await supabase.rpc('reorder_plan_stops', {
        p_plan_id: planId,
        p_stop_orders: stopOrders
      })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['floq-activity'] })
    },
    onError: (error) => {
      console.error('Failed to reorder stops:', error)
      toast({
        title: 'Failed to reorder stops',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })
}

// Legacy hook for backward compatibility
export function useUpdateStopOrder() {
  const reorderMutation = useReorderPlanStops()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ planId, stopId, newOrder }: LegacyUpdateStopOrderParams) => {
      return reorderMutation.mutateAsync({
        planId,
        stopOrders: [{ id: stopId, stop_order: newOrder }]
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
    },
    onError: (error) => {
      console.error('Failed to update stop order:', error)
      toast({
        title: 'Failed to reorder stop',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })
}
