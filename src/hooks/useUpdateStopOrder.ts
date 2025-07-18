
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface UpdateStopOrderParams {
  planId: string
  stopId: string
  newOrder: number
}

export function useUpdateStopOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ planId, stopId, newOrder }: UpdateStopOrderParams) => {
      const { error } = await supabase
        .from('plan_stops')
        .update({ stop_order: newOrder })
        .eq('id', stopId)
        .eq('plan_id', planId)

      if (error) throw error
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
