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
  const [saving, setSaving] = useState<'idle' | 'pending' | 'done'>('idle')
  
  const { toast } = useToast()
  const reorderMutation = useReorderPlanStops()
  const { data: stops = [], isLoading } = usePlanStops(planId)

  // Initialize optimistic order from stops on mount and when stops change
  useEffect(() => {
    if (stops.length > 0) {
      const currentOrder = stops
        .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0))
        .map(stop => stop.id)
      setOptimisticOrder(currentOrder)
    }
  }, [stops])

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
      channel.unsubscribe().catch(console.error)
    }
  }, [planId, enabled])

  // Remove legacy handleStopReorder - keeping only the new reorder method

  // New reorder method that takes ordered stop IDs directly
  const reorder = useCallback(async (orderedIds: string[]) => {
    if (isReordering) return

    setIsReordering(true)
    setSaving('pending')
    
    try {
      // Optimistic update
      setOptimisticOrder(orderedIds)

      // Call RPC directly
      const { error } = await supabase.rpc('reorder_plan_stops', {
        p_plan_id: planId,
        p_stop_orders: orderedIds,
      })

      if (error) throw error

      setSaving('done')
      setTimeout(() => setSaving('idle'), 1500)

    } catch (error) {
      console.error('Reorder failed:', error)
      setSaving('idle')
      
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
  }, [planId, stops, isReordering, toast])

  // Get stops in optimistic order
  const orderedStops = optimisticOrder
    .map(id => stops.find(stop => stop.id === id))
    .filter(Boolean)

  return {
    stops: orderedStops,
    isLoading,
    isReordering,
    reorder,
    optimisticOrder,
    saving,
  }
}