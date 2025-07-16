import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { usePlanSync } from './usePlanSync'
import { usePlanRealTimeSync } from './usePlanRealTimeSync'

// Mock data for when no plan ID is provided
const MOCK_PLAN = {
  id: "plan-1",
  title: "Night Out in Arts District",
  date: "2024-07-16",
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
      color: "hsl(220 70% 60%)"
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
      color: "hsl(280 70% 60%)"
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
  
  // State for optimistic updates
  const [optimisticStops, setOptimisticStops] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  
  // Real-time sync and plan sync hooks
  const planSync = usePlanSync()
  const { 
    activeParticipants, 
    connectionStatus,
    broadcastTyping 
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
      if (!planId || (process.env.NODE_ENV === 'development' && planId === 'plan-1')) return MOCK_PLAN
      
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
      const transformedData = {
        id: data.id,
        title: data.title,
        date: data.planned_at,
        stops: data.stops.map((stop: any) => ({
          id: stop.id,
          title: stop.title,
          venue: stop.venue?.name || 'TBD',
          description: stop.description || '',
          startTime: stop.start_time || '19:00',
          endTime: stop.end_time || '21:00',
          location: stop.address || '',
          vibeMatch: 75,
          status: 'confirmed' as const,
          color: "hsl(220 70% 60%)"
        })),
        participants: data.participants.map((p: any) => ({
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

  // Merge optimistic updates with real data
  const plan = planData ? {
    ...planData,
    stops: optimisticStops.length > 0 ? optimisticStops : planData.stops
  } : MOCK_PLAN

  const addStop = useCallback(async (newStop: any) => {
    if (!planId) return
    
    const tempId = `temp-${Date.now()}`
    const optimisticStop = {
      id: tempId,
      ...newStop,
      duration_minutes: newStop.duration_minutes ?? 60, // Fallback to 60 minutes
      status: 'pending' as const
    }
    
    // Optimistic update
    setOptimisticStops(prev => [...prev, optimisticStop])
    
    try {
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
    if (!planId) return
    
    // Optimistic update
    const originalStops = optimisticStops
    setOptimisticStops(prev => prev.filter(s => s.id !== stopId))
    
    try {
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

  const reorderStops = useCallback(async (startIndex: number, endIndex: number) => {
    if (!planId) return
    
    // Optimistic update
    const originalStops = [...optimisticStops]
    const newStops = [...optimisticStops]
    const [removed] = newStops.splice(startIndex, 1)
    newStops.splice(endIndex, 0, removed)
    setOptimisticStops(newStops)
    
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
      // Rollback on error
      setOptimisticStops(originalStops)
      console.error('Failed to reorder stops:', error)
    }
  }, [planId, planSync, optimisticStops])

  const voteOnStop = useCallback(async (stopId: string, vote: string) => {
    if (!planId) return
    
    try {
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
    try {
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
    connectionStatus,
    broadcastTyping,
    isOptimistic: planSync.isPending
  }
}