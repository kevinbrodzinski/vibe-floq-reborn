import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useSession } from '@/hooks/useSession'

// ================================================================
// UNIFIED PLAN STOPS MANAGEMENT SYSTEM
// This replaces all the fragmented stop creation approaches
// ================================================================

interface CreateStopPayload {
  plan_id: string
  title: string
  description?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  venue_id?: string | null
  estimated_cost_per_person?: number | null
  address?: string
}

interface UpdateStopPayload extends CreateStopPayload {
  id: string
}

interface ReorderStopsPayload {
  plan_id: string
  stop_orders: Array<{ id: string; stop_order: number }>
}

// ================================================================
// MAIN UNIFIED HOOK
// ================================================================
export function useUnifiedPlanStops(planId?: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const session = useSession()

  // ================================================================
  // CREATE STOP (Uses database RPC for proper ordering)
  // ================================================================
  const createStop = useMutation({
    mutationFn: async (payload: CreateStopPayload) => {
      if (!session?.user) {
        throw new Error('Authentication required')
      }

      // Use the database RPC function for proper ordering and validation
              const { data, error } = await supabase.rpc('add_plan_stop_with_order', {
          p_plan_id: payload.plan_id,
          p_title: payload.title,
          p_description: payload.description || null,
          p_start_time: null, // Temporarily disabled until DB migration is applied
          p_end_time: null,   // Temporarily disabled until DB migration is applied
          p_duration_minutes: payload.duration_minutes || 60,
          p_venue_id: payload.venue_id || null,
          p_estimated_cost: payload.estimated_cost_per_person || null
        })

      if (error) {
        console.error('RPC Error creating stop:', error)
        throw new Error(error.message || 'Failed to create stop')
      }

      return { id: data as string }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
      
      toast({
        title: 'Stop added successfully',
        description: `"${variables.title}" has been added to your plan`,
      })
    },
    onError: (error: Error) => {
      console.error('Failed to create stop:', error)
      toast({
        title: 'Failed to add stop',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  // ================================================================
  // UPDATE STOP
  // ================================================================
  const updateStop = useMutation({
    mutationFn: async (payload: UpdateStopPayload) => {
      if (!session?.user) {
        throw new Error('Authentication required')
      }

      const { data, error } = await supabase
        .from('plan_stops')
        .update({
          title: payload.title,
          description: payload.description,
          start_time: payload.start_time,
          end_time: payload.end_time,
          duration_minutes: payload.duration_minutes,
          venue_id: payload.venue_id,
          estimated_cost_per_person: payload.estimated_cost_per_person,
          address: payload.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id)
        .eq('plan_id', payload.plan_id) // Security check
        .select()
        .single()

      if (error) {
        console.error('Error updating stop:', error)
        throw new Error(error.message || 'Failed to update stop')
      }

      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      
      toast({
        title: 'Stop updated',
        description: `"${variables.title}" has been updated`,
      })
    },
    onError: (error: Error) => {
      console.error('Failed to update stop:', error)
      toast({
        title: 'Failed to update stop',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  // ================================================================
  // DELETE STOP
  // ================================================================
  const deleteStop = useMutation({
    mutationFn: async ({ stopId, planId: targetPlanId }: { stopId: string; planId: string }) => {
      if (!session?.user) {
        throw new Error('Authentication required')
      }

      const { error } = await supabase
        .from('plan_stops')
        .delete()
        .eq('id', stopId)
        .eq('plan_id', targetPlanId) // Security check

      if (error) {
        console.error('Error deleting stop:', error)
        throw new Error(error.message || 'Failed to delete stop')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.planId] })
      
      toast({
        title: 'Stop removed',
        description: 'Stop has been removed from your plan',
      })
    },
    onError: (error: Error) => {
      console.error('Failed to delete stop:', error)
      toast({
        title: 'Failed to remove stop',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  // ================================================================
  // REORDER STOPS (Uses database RPC for consistency)
  // ================================================================
  const reorderStops = useMutation({
    mutationFn: async (payload: ReorderStopsPayload) => {
      if (!session?.user) {
        throw new Error('Authentication required')
      }

      const { error } = await supabase.rpc('reorder_plan_stops', {
        p_plan_id: payload.plan_id,
        p_stop_orders: JSON.stringify(payload.stop_orders)
      })

      if (error) {
        console.error('Error reordering stops:', error)
        throw new Error(error.message || 'Failed to reorder stops')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
      
      toast({
        title: 'Stops reordered',
        description: 'Stop order has been updated',
      })
    },
    onError: (error: Error) => {
      console.error('Failed to reorder stops:', error)
      toast({
        title: 'Failed to reorder stops',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  // ================================================================
  // CONVENIENCE METHODS
  // ================================================================
  const addQuickStop = async (title: string, description?: string) => {
    if (!planId) throw new Error('Plan ID required')
    
    return createStop.mutateAsync({
      plan_id: planId,
      title,
      description,
      start_time: '19:00',
      end_time: '20:00',
      duration_minutes: 60
    })
  }

  const addStopFromSuggestion = async (suggestion: { title: string; body?: string }) => {
    if (!planId) throw new Error('Plan ID required')
    
    return createStop.mutateAsync({
      plan_id: planId,
      title: suggestion.title,
      description: suggestion.body,
      start_time: '19:00',
      end_time: '20:00',
      duration_minutes: 60
    })
  }

  return {
    // Mutations
    createStop,
    updateStop,
    deleteStop,
    reorderStops,
    
    // Convenience methods
    addQuickStop,
    addStopFromSuggestion,
    
    // Loading states
    isCreating: createStop.isPending,
    isUpdating: updateStop.isPending,
    isDeleting: deleteStop.isPending,
    isReordering: reorderStops.isPending,
    
    // Any operation in progress
    isLoading: createStop.isPending || updateStop.isPending || deleteStop.isPending || reorderStops.isPending
  }
}