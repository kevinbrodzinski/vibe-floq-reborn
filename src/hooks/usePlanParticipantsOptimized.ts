import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type PlanParticipantWithProfile = {
  id: string
  profile_id: string | null
  role: string
  joined_at: string
  is_guest: boolean
  guest_name: string | null
  rsvp_status?: 'yes' | 'no' | 'maybe' | 'pending' | null
  display_name?: string
  profiles?: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

export function usePlanParticipantsOptimized(planId: string) {
  const queryClient = useQueryClient()
  
  const query = useQuery<PlanParticipantWithProfile[]>({
    queryKey: ['plan-participants', planId],
    queryFn: async () => {
      // Try the optimized join first
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          id,
          profile_id,
          role,
          joined_at,
          is_guest,
          guest_name,
          profiles!profile_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', planId as any)
        .returns<any>()
      
      if (error) {
        console.warn('[PlanParticipants] Join fallback due to:', error.message)
        
        // Fallback: Fetch participants and profiles separately
        const { data: participants, error: participantsError } = await supabase
          .from('plan_participants')
          .select('*')
          .eq('plan_id', planId as any)
          .returns<any>()
        
        if (participantsError) throw participantsError
        
        // Get unique profile IDs (excluding guests)
        const profileIds = (participants as any[])
          ?.filter((p: any) => !p.is_guest && p.profile_id)
          .map((p: any) => p.profile_id)
          .filter(Boolean) || []
        
        if (profileIds.length === 0) {
          return (participants as any[])?.map((p: any) => ({ ...p, profiles: null })) || []
        }
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', profileIds as any)
          .returns<any>()
        
        if (profilesError) {
          console.warn('[PlanParticipants] Profiles fetch failed:', profilesError)
          return (participants as any[])?.map((p: any) => ({ ...p, profiles: null })) || []
        }
        
        // Manually join the data
        return (participants as any[])?.map((participant: any) => ({
          ...participant,
          profiles: participant.is_guest 
            ? null 
            : (profiles as any[])?.find((profile: any) => (profile as any).id === (participant as any).profile_id) || null
        })) || []
      }
      
      return data || []
    },
    enabled: !!planId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  })

  // Real-time subscription for participants
  useEffect(() => {
    if (!planId) return

    const channel = supabase
      .channel(`plan-participants-${planId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plan_participants',
        filter: `plan_id=eq.${planId}`
      }, () => {
        // Invalidate and refetch on any change
        queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [planId, queryClient])

  return query
}