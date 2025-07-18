import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { mapPlanStopFromDb } from '@/types/mappers'
import type { PlanStop } from '@/types/plan'
import type { PlanStopRow } from '@/types/database'

interface CollaborativeState {
  stops: PlanStop[];
  isLoading: boolean;
  plan: any;
  activities: any[];
  addStop: any;
  updateStop: any;
  deleteStop: any;
  removeStop: (id: string) => Promise<void>;
  reorderStops: (from: number, to: number) => Promise<void>;
  voteOnStop: (stopId: string, vote: string) => void;
  updateParticipantStatus: (userId: string, status: string) => void;
  recentVotes: any[];
}

export function useCollaborativeState(planId: string): CollaborativeState {
  const [optimisticStops, setOptimisticStops] = useState<PlanStop[]>([])
  const session = useSession()
  const queryClient = useQueryClient()

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
        .order('start_time', { ascending: true })
        .returns<PlanStopRow[]>()
      
      if (error) throw error
      
      // Map database rows to domain objects
      return (data || []).map(mapPlanStopFromDb)
    },
    enabled: !!planId,
  })

  const { mutate: addStop } = useMutation({
    mutationFn: async (newStop: Omit<PlanStop, 'id'>) => {
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('plan_stops')
        .insert({
          plan_id: planId,
          created_by: session.user.id,
          title: newStop.title,
          description: newStop.description || '',
          start_time: newStop.start_time,
          end_time: newStop.end_time,
          address: newStop.address || '',
          stop_order: 0,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(['plan-stops', planId], (old: PlanStop[] | undefined) => {
        if (!old) return [data]
        return [...old, data]
      })
      setOptimisticStops(prev => prev.filter(stop => stop.id !== data.id))
    },
    onError: (error) => {
      console.error('Failed to add stop:', error)
      setOptimisticStops(prev => prev.slice(0, -1))
    },
  })

  const { mutate: updateStop } = useMutation({
    mutationFn: async (updatedStop: PlanStop) => {
      const { data, error } = await supabase
        .from('plan_stops')
        .update(updatedStop)
        .eq('id', updatedStop.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(['plan-stops', planId], (old: PlanStop[] | undefined) => {
        if (!old) return [data]
        return old.map(stop => stop.id === data.id ? data : stop)
      })
    },
    onError: (error) => {
      console.error('Failed to update stop:', error)
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
    },
    onError: (error) => {
      console.error('Failed to delete stop:', error)
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

  const mockPlan = {
    id: planId,
    title: 'Mock Plan',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    creator_id: 'current-user',
    participants: [],
    stops: allStops
  };

  return {
    stops: allStops,
    isLoading,
    plan: mockPlan,
    activities: [],
    addStop,
    updateStop,
    deleteStop,
    removeStop: (id: string) => Promise.resolve(),
    reorderStops: (from: number, to: number) => Promise.resolve(),
    voteOnStop: () => {},
    updateParticipantStatus: () => {},
    recentVotes: [],
    addOptimisticStop,
  }
}
