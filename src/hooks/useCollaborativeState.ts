
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { useToast } from '@/hooks/use-toast'
import { mapPlanStopFromDb } from '@/types/mappers'
import type { PlanStop } from '@/types/plan'
import type { PlanStopRow } from '@/types/database'

interface CollaborativeState {
  stops: PlanStop[];
  isLoading: boolean;
  isDragOperationPending: boolean;
  removeStop: (id: string) => Promise<void>;
  reorderStops: (from: number, to: number) => Promise<void>;
  addStop: (stop: PlanStop) => Promise<void>;
  voteOnStop: (stopId: string, voteType: 'upvote' | 'downvote' | 'maybe', emoji?: string) => Promise<void>;
}

export function useCollaborativeState(planId: string): CollaborativeState {
  const [optimisticStops, setOptimisticStops] = useState<PlanStop[]>([])
  const session = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Simple hook that just returns data - no complex collaborative features for now
  const { data: planStops = [], isLoading } = useQuery({
    queryKey: ['plan-stops', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_stops')
        .select(`
          *,
          venue:venues(*)
        `)
        .eq('plan_id', planId)
        .order('stop_order', { ascending: true })
        .returns<PlanStopRow[]>()
      
      if (error) throw error
      
      // Map database rows to domain objects
      return (data || []).map(mapPlanStopFromDb)
    },
    enabled: !!planId,
  })

  const { mutateAsync: addStopMutation } = useMutation({
    mutationFn: async (newStop: PlanStop) => {
      if (!session?.user) {
        // Check if user is a guest
        const guestId = localStorage.getItem('guest_participant_id')
        if (!guestId) throw new Error('Not authenticated')
      }

      // Get current count first, then insert
      const { count } = await supabase
        .from('plan_stops')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', planId)

      const { data, error } = await supabase
        .from('plan_stops')
        .insert({
          plan_id: planId,
          created_by: session?.user?.id || localStorage.getItem('guest_participant_id'),
          title: newStop.title,
          description: newStop.description || '',
          start_time: newStop.startTime || newStop.start_time,
          end_time: newStop.endTime || newStop.end_time,
          address: newStop.address || '',
          location: newStop.location || '',
          stop_order: (count || 0) + 1,
        })
        .select()
        .single()

      if (error) throw error
      return mapPlanStopFromDb(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      setOptimisticStops(prev => prev.filter(stop => stop.id !== data.id))
      toast({
        title: 'Stop added',
        description: 'Your stop has been added to the plan.',
      })
    },
    onError: (error) => {
      console.error('Failed to add stop:', error)
      setOptimisticStops(prev => prev.slice(0, -1))
      toast({
        title: 'Failed to add stop',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })

  const { mutateAsync: reorderStopsMutation, isPending: isReordering } = useMutation({
    mutationFn: async ({ stopIds }: { stopIds: string[] }) => {
      // Use the reorder_plan_stops RPC function
      const { error } = await supabase.rpc('reorder_plan_stops', {
        p_plan_id: planId,
        p_stop_ids: stopIds,
      })
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      toast({
        title: 'Timeline reordered',
        description: 'Your stops have been successfully reordered.',
      })
    },
    onError: (error) => {
      console.error('Failed to reorder stops:', error)
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
      toast({
        title: 'Reorder failed',
        description: 'Could not save the new order. Changes have been reverted.',
        variant: 'destructive',
      })
    },
  })

  const { mutate: deleteStop } = useMutation({
    mutationFn: async (stopId: string) => {
      const { error } = await supabase
        .from('plan_stops')
        .delete()
        .eq('id', stopId)

      if (error) throw error
    },
    onSuccess: (_, stopId) => {
      // Optimistically update the cache
      queryClient.setQueryData(['plan-stops', planId], (old: PlanStop[] | undefined) => {
        if (!old) return []
        return old.filter(stop => stop.id !== stopId)
      })
      toast({
        title: 'Stop removed',
        description: 'The stop has been removed from your plan.',
      })
    },
    onError: (error) => {
      console.error('Failed to delete stop:', error)
      toast({
        title: 'Failed to remove stop',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })

  const allStops = [...planStops, ...optimisticStops]

  const addOptimisticStop = useCallback((tempStop: Partial<PlanStop>) => {
    const newStop: PlanStop = {
      id: `temp-${Date.now()}`,
      title: tempStop.title || 'New Stop',
      startTime: tempStop.startTime || '18:00',
      endTime: tempStop.endTime || '19:00',
      venue: tempStop.venue || '',
      description: tempStop.description || '',
      location: tempStop.location || '',
      vibeMatch: 0.8,
      color: '#3B82F6',
      duration_minutes: 60,
      status: 'pending' as const,
      participants: [],
      createdBy: '',
      start_time: tempStop.startTime || '18:00',
      end_time: tempStop.endTime || '19:00',
      votes: [],
      kind: 'restaurant' as any,
      plan_id: planId,
    }

    setOptimisticStops(prev => [...prev, newStop])
  }, [planId])

  const removeStop = async (id: string) => {
    deleteStop(id)
  }
  
  const reorderStops = async (from: number, to: number) => {
    const currentStops = allStops
    const reorderedStops = [...currentStops]
    const [movedStop] = reorderedStops.splice(from, 1)
    reorderedStops.splice(to, 0, movedStop)
    
    const stopIds = reorderedStops.map(stop => stop.id).filter(id => !id.startsWith('temp-'))
    
    // Store original state for rollback
    const originalStops = [...currentStops]
    
    // Optimistically update the UI
    queryClient.setQueryData(['plan-stops', planId], 
      reorderedStops.filter(s => !s.id.startsWith('temp-'))
    )
    
    try {
      await reorderStopsMutation({ stopIds })
    } catch (error) {
      // Rollback to original state
      queryClient.setQueryData(['plan-stops', planId], 
        originalStops.filter(s => !s.id.startsWith('temp-'))
      )
      throw error
    }
  }

  const voteOnStop = async (stopId: string, voteType: 'upvote' | 'downvote' | 'maybe', emoji?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const guestId = localStorage.getItem('guest_participant_id')
    
    if (!user && !guestId) {
      throw new Error('Must be logged in or joined as guest to vote')
    }
    
    const { error } = await supabase
      .from('plan_stop_votes')
      .upsert({
        plan_id: planId,
        stop_id: stopId,
        user_id: user?.id || null,
        guest_id: guestId || null,
        vote_type: voteType,
        emoji_reaction: emoji
      })
    
    if (error) {
      console.error('Vote error:', error)
      toast({
        title: 'Failed to vote',
        description: 'Please try again.',
        variant: 'destructive',
      })
      throw error
    }
    
    toast({
      title: 'Vote recorded',
      description: `You voted ${voteType} on this stop.`,
    })
    
    queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] })
  }

  return {
    stops: allStops,
    isLoading,
    isDragOperationPending: isReordering,
    removeStop,
    reorderStops,
    addStop: async (stop: PlanStop) => {
      addOptimisticStop(stop)
      await addStopMutation(stop)
    },
    voteOnStop,
  }
}
