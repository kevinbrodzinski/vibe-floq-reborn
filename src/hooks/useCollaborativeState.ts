import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useReorderPlanStops } from './useUpdateStopOrder'
import { usePlanStops } from './usePlanStops'
import { useToast } from './use-toast'

interface CollaborativeStateOptions {
  planId: string
  enabled?: boolean
}

export function useCollaborativeState({ planId, enabled = true }: CollaborativeStateOptions) {
  const [isReordering, setIsReordering] = useState(false)
  const [optimisticOrder, setOptimisticOrder] = useState<string[]>([])
  
  const { toast } = useToast()
  const reorderMutation = useReorderPlanStops()
  const { data: stops = [], isLoading } = usePlanStops(planId)

  // Reset optimistic state when stops change
  useEffect(() => {
    if (!isReordering && stops.length > 0) {
      const currentOrder = stops
        .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0))
        .map(stop => stop.id)
      setOptimisticOrder(currentOrder)
    }
  }, [stops, isReordering])

  // Real-time subscription for collaborative changes
  useEffect(() => {
    if (!enabled || !planId) return

    const channel = supabase
      .channel(`plan_stops_${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_stops',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          console.log('Plan stops changed:', payload)
          // The query will automatically refetch due to invalidation
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_votes',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          console.log('Plan votes changed:', payload)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [planId, enabled])

  const handleStopReorder = useCallback(async (stopId: string, newIndex: number) => {
    if (isReordering) return

    setIsReordering(true)
    
    try {
      // Optimistic update
      const newOrder = [...optimisticOrder]
      const currentIndex = newOrder.findIndex(id => id === stopId)
      
      if (currentIndex !== -1) {
        newOrder.splice(currentIndex, 1)
        newOrder.splice(newIndex, 0, stopId)
        setOptimisticOrder(newOrder)
      }

      // Build reorder data
      const stopOrders = newOrder.map((id, index) => ({
        id,
        stop_order: index + 1
      }))

      await reorderMutation.mutateAsync({
        planId,
        stopOrders
      })

    } catch (error) {
      console.error('Reorder failed:', error)
      
      // Revert optimistic update
      const revertOrder = stops
        .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0))
        .map(stop => stop.id)
      setOptimisticOrder(revertOrder)
      
      toast({
        title: 'Reorder failed',
        description: 'Failed to update stop order. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsReordering(false)
    }
  }, [planId, optimisticOrder, stops, isReordering, reorderMutation, toast])

  // Get stops in optimistic order
  const orderedStops = optimisticOrder
    .map(id => stops.find(stop => stop.id === id))
    .filter(Boolean)

  return {
    stops: orderedStops,
    isLoading,
    isReordering,
    handleStopReorder,
    optimisticOrder,
  }
}