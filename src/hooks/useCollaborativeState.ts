import { useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { usePlanSync } from './usePlanSync'
import { usePlanRealTimeSync } from './usePlanRealTimeSync'
import { usePresence } from './usePresence'
import { debounce } from 'lodash-es'
import type { Plan, PlanStop, PlanParticipant } from '@/types/plan'

// Constants for fallbacks
const MOCK_PLAN_ID = "plan-1"

// Mock data for when no plan ID is provided
const MOCK_PLAN: Plan = {
  id: MOCK_PLAN_ID,
  title: "Night Out in Arts District",
  date: "2024-07-16",
  status: "draft",
  created_by: "current-user",
  stops: [
    {
      id: "stop-1",
      title: "Dinner at Bestia",
      venue: "Bestia",
      description: "Italian bone marrow, beef tartare",
      startTime: "19:00",
      endTime: "21:00",
      location: "2121 E 7th Pl, Los Angeles",
      vibeMatch: 85,
      status: "confirmed" as const,
      color: "hsl(220 70% 60%)",
      duration_minutes: 120,
      participants: []
    },
    {
      id: "stop-2", 
      title: "Cocktails at Seven Grand",
      venue: "Seven Grand",
      description: "Whiskey bar with live music",
      startTime: "21:30",
      endTime: "23:30",
      location: "515 W 7th St, Los Angeles",
      vibeMatch: 75,
      status: "suggested" as const,
      color: "hsl(280 70% 60%)",
      duration_minutes: 120,
      participants: []
    }
  ],
  participants: [
    { id: "user-1", name: "Alex", avatar: "", status: "confirmed" },
    { id: "user-2", name: "Jamie", avatar: "", status: "pending" },
    { id: "user-3", name: "Sam", avatar: "", status: "confirmed" }
  ]
}

export function useCollaborativeState(fallbackPlanId?: string) {
  const { planId: routePlanId } = useParams()
  const planId = routePlanId || fallbackPlanId
  const queryClient = useQueryClient()
  
  // State for optimistic updates - strongly typed
  const [optimisticStops, setOptimisticStops] = useState<PlanStop[]>([])
  const [activities, setActivities] = useState<any[]>([])
  
  // Hooks
  const planSync = usePlanSync()
  const presence = usePresence(planId || '')
  const { 
    activeParticipants, 
    connectionStatus
  } = usePlanRealTimeSync(planId || '', {
    onStopUpdate: (payload) => {
      // Invalidate and refetch on external stop changes
      queryClient.invalidateQueries({ queryKey: ['floq-plan', planId] })
      setActivities(prev => [...prev, {
        id: `activity-${Date.now()}`,
        type: 'stop_updated',
        timestamp: new Date().toISOString(),
        user: payload.new?.created_by || 'Unknown',
        details: `Stop "${payload.new?.title}" was updated`
      }])
    },
    onParticipantJoin: (participant) => {
      setActivities(prev => [...prev, {
        id: `activity-${Date.now()}`,
        type: 'participant_joined',
        timestamp: new Date().toISOString(),
        user: participant.user_id,
        details: 'joined the plan'
      }])
    },
    onParticipantLeave: (participant) => {
      setActivities(prev => [...prev, {
        id: `activity-${Date.now()}`,
        type: 'participant_left',
        timestamp: new Date().toISOString(),
        user: participant.user_id,
        details: 'left the plan'
      }])
    }
  })
  
  // Fetch real plan data when planId is provided
  const { data: planData, isLoading } = useQuery({
    queryKey: ['floq-plan', planId],
    queryFn: async () => {
      if (!planId || (process.env.NODE_ENV === 'development' && planId === MOCK_PLAN_ID)) return MOCK_PLAN
      
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          *,
          floq:floqs(title),
          stops:plan_stops(
            *,
            venue:venues(*)
          ),
          participants:plan_participants(
            *,
            profile:profiles(display_name, username, avatar_url)
          )
        `)
        .eq('id', planId)
        .single()
      
      if (error) throw error
      
      // Transform to expected format
      const transformedData: Plan = {
        id: data.id,
        title: data.title,
        date: data.planned_at,
        stops: data.stops.map((stop: any): PlanStop => ({
          id: stop.id,
          title: stop.title,
          venue: stop.venue?.name || 'TBD',
          description: stop.description || '',
          startTime: stop.start_time || '19:00',
          endTime: stop.end_time || '21:00',
          start_time: stop.start_time || '19:00',
          end_time: stop.end_time || '21:00',
          location: stop.address || '',
          vibeMatch: 75,
          status: 'confirmed' as const,
          color: "hsl(220 70% 60%)",
          duration_minutes: stop.duration_minutes ?? 60, // Fallback to 60 minutes
          stop_order: stop.stop_order,
          participants: []
        })),
        participants: data.participants.map((p: any): PlanParticipant => ({
          id: p.user_id,
          name: p.profile?.display_name || p.profile?.username || 'User',
          avatar: p.profile?.avatar_url || '',
          status: p.rsvp_status || 'pending'
        }))
      }
      
      // Update optimistic stops when real data loads
      setOptimisticStops(transformedData.stops)
      return transformedData
    },
    enabled: !!planId
  })

  // Memoized plan object to reduce unnecessary renders
  const plan = useMemo(() => {
    if (!planData) return MOCK_PLAN
    return {
      ...planData,
      stops: optimisticStops.length ? optimisticStops : planData.stops
    }
  }, [planData, optimisticStops])

  const addStop = useCallback(async (newStop: Partial<PlanStop>) => {
    if (!planSync || !planId) return
    
    const tempId = `temp-${Date.now()}`
    const optimisticStop: PlanStop = {
      id: tempId,
      title: newStop.title || 'New Stop',
      startTime: newStop.startTime || '19:00',
      endTime: newStop.endTime || '21:00',
      venue: newStop.venue || 'TBD',
      description: newStop.description || '',
      location: newStop.location || '',
      vibeMatch: newStop.vibeMatch || 75,
      color: newStop.color || "hsl(220 70% 60%)",
      duration_minutes: newStop.duration_minutes ?? 60, // Fallback to 60 minutes
      status: 'pending' as const,
      participants: []
    }
    
    // Optimistic update
    setOptimisticStops(prev => [...prev, optimisticStop])
    
    try {
      if (!planSync?.mutateAsync) {
        throw new Error('Plan sync not available')
      }
      
      await planSync.mutateAsync({
        plan_id: planId,
        changes: {
          type: 'update_stop',
          data: {
            action: 'add',
            stop: newStop
          }
        }
      })
    } catch (error) {
      // Rollback on error
      setOptimisticStops(prev => prev.filter(s => s.id !== tempId))
      console.error('Failed to add stop:', error)
    }
  }, [planId, planSync])

  const removeStop = useCallback(async (stopId: string) => {
    if (!planSync || !planId) return
    
    // Deep copy for proper rollback
    const originalStops = [...optimisticStops]
    setOptimisticStops(prev => prev.filter(s => s.id !== stopId))
    
    try {
      if (!planSync?.mutateAsync) {
        throw new Error('Plan sync not available')
      }
      await planSync.mutateAsync({
        plan_id: planId,
        changes: {
          type: 'update_stop',
          data: {
            action: 'remove',
            stopId
          }
        }
      })
    } catch (error) {
      // Rollback on error
      setOptimisticStops(originalStops)
      console.error('Failed to remove stop:', error)
    }
  }, [planId, planSync, optimisticStops])

  // Debounced reorder to reduce API traffic during fast drag operations
  const debouncedReorderStops = useCallback(
    debounce(async (planId: string, newStops: PlanStop[]) => {
      if (!planSync?.mutateAsync) return
      
      try {
        await planSync.mutateAsync({
          plan_id: planId,
          changes: {
            type: 'reorder_stops',
            data: {
              stops: newStops.map((stop, index) => ({
                id: stop.id,
                stop_order: index
              }))
            }
          }
        })
      } catch (error) {
        console.error('Failed to reorder stops:', error)
      }
    }, 300),
    [planSync]
  )

  const reorderStops = useCallback(async (startIndex: number, endIndex: number) => {
    if (!planSync || !planId) return
    
    // Optimistic update
    const originalStops = [...optimisticStops]
    const newStops = [...optimisticStops]
    const [removed] = newStops.splice(startIndex, 1)
    newStops.splice(endIndex, 0, removed)
    setOptimisticStops(newStops)
    
    try {
      // Use debounced version for performance
      debouncedReorderStops(planId, newStops)
    } catch (error) {
      // Rollback on error
      setOptimisticStops(originalStops)
      console.error('Failed to reorder stops:', error)
    }
  }, [planId, planSync, optimisticStops])

  const voteOnStop = useCallback(async (stopId: string, vote: string) => {
    if (!planSync || !planId) return
    
    try {
      if (!planSync?.mutateAsync) {
        throw new Error('Plan sync not available')
      }
      await planSync.mutateAsync({
        plan_id: planId,
        changes: {
          type: 'update_stop',
          data: {
            action: 'vote',
            stopId,
            vote
          }
        }
      })
    } catch (error) {
      console.error('Failed to vote on stop:', error)
    }
  }, [planId, planSync])

  const updateParticipantStatus = useCallback(async (participantId: string, status: string) => {
    if (!planSync) return
    
    try {
      if (!planSync?.mutateAsync) {
        throw new Error('Plan sync not available')
      }
      await planSync.mutateAsync({
        plan_id: planId || '',
        changes: {
          type: 'presence_update',
          data: {
            participantId,
            status
          }
        }
      })
    } catch (error) {
      console.error('Failed to update participant status:', error)
    }
  }, [planId, planSync])

  // Group participants by status for better UX
  const groupedParticipants = useMemo(() => {
    return {
      online: activeParticipants.filter(p => presence.isUserActive(p.id)),
      editing: activeParticipants.filter(p => presence.typingUsers.includes(p.id)),
      away: activeParticipants.filter(p => !presence.isUserActive(p.id))
    }
  }, [activeParticipants, presence])

  return {
    plan,
    activities,
    isLoading,
    addStop,
    removeStop,
    reorderStops,
    voteOnStop,
    updateParticipantStatus,
    // Real-time collaboration features
    activeParticipants,
    groupedParticipants,
    connectionStatus,
    broadcastTyping: presence.broadcastTyping,
    isOptimistic: planSync?.isPending || false
  }
}