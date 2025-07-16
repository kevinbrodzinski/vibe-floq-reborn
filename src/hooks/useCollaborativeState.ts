import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

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
  
  // Fetch real plan data when planId is provided
  const { data: planData, isLoading } = useQuery({
    queryKey: ['floq-plan', planId],
    queryFn: async () => {
      if (!planId || planId === 'plan-1') return MOCK_PLAN
      
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
      return {
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
    },
    enabled: !!planId
  })

  const plan = planData || MOCK_PLAN
  const [activities, setActivities] = useState<any[]>([])

  const addStop = useCallback((newStop: any) => {
    // In real implementation, this would call the sync hook
    console.log('Adding stop:', newStop)
  }, [])

  const removeStop = useCallback((stopId: string) => {
    console.log('Removing stop:', stopId)
  }, [])

  const reorderStops = useCallback((startIndex: number, endIndex: number) => {
    console.log('Reordering stops:', startIndex, endIndex)
  }, [])

  const voteOnStop = useCallback((stopId: string, vote: string) => {
    console.log('Voting on stop:', stopId, vote)
  }, [])

  const updateParticipantStatus = useCallback((participantId: string, status: string) => {
    console.log('Updating participant status:', participantId, status)
  }, [])

  return {
    plan,
    activities,
    isLoading,
    addStop,
    removeStop,
    reorderStops,
    voteOnStop,
    updateParticipantStatus
  }
}