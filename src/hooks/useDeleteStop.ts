import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { usePlanSync } from './usePlanSync'
import { toast } from '@/hooks/use-toast'
import type { PlanStop } from '@/types/plan'

export function useDeleteStop() {
  const queryClient = useQueryClient()
  const { mutate: sync } = usePlanSync()

  return useMutation({
    mutationFn: async ({ planId, stopId }: { planId: string; stopId: string }) => {
      const { error } = await supabase
        .from('plan_stops')
        .delete()
        .eq('id', stopId as any)
        .eq('plan_id', planId as any)

      if (error) throw error
    },
    onMutate: async ({ planId, stopId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan-stops', planId] })
      
      // Snapshot current value
      const previousStops = queryClient.getQueryData<PlanStop[]>(['plan-stops', planId])
      
      // Optimistically update
      queryClient.setQueryData(
        ['plan-stops', planId],
        (old: PlanStop[] | undefined) => old?.filter(s => s.id !== stopId) || []
      )
      
      return { previousStops }
    },
    onError: (error, { planId }, context) => {
      // Rollback on error
      if (context?.previousStops) {
        queryClient.setQueryData(['plan-stops', planId], context.previousStops)
      }
      
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive",
        duration: 2500
      })
    },
    onSuccess: (_, { planId, stopId }) => {
      // Sync the change to other users
      sync({
        plan_id: planId,
        changes: {
          type: 'delete_stop',
          data: { id: stopId }
        }
      })
      
      toast({
        title: "Stop deleted",
        duration: 2500
      })
    },
  })
}