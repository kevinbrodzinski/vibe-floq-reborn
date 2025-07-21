import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { RSVPStatus } from '@/types/enums/rsvpStatus'

export interface PlanParticipant {
  id: string
  user_id: string | null
  plan_id: string
  role: string | null
  joined_at: string
  is_guest: boolean
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  notes: string | null
  invited_at: string
  responded_at: string | null
  rsvp_status: RSVPStatus | null
  profiles?: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

export function usePlanParticipants(plan_id: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['plan-participants', plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          id,
          user_id,
          plan_id,
          role,
          joined_at,
          is_guest,
          guest_name,
          guest_email,
          guest_phone,
          notes,
          invited_at,
          responded_at,
          rsvp_status,
          profiles!user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', plan_id)
        .order('joined_at', { ascending: true })
      
      if (error) {
        console.error('Plan participants fetch error:', error)
        throw error
      }
      
      return (data || []) as PlanParticipant[]
    },
    enabled: !!plan_id,
  })

  // Set up real-time subscriptions
  useEffect(() => {
    if (!plan_id) return

    const channel = supabase
      .channel(`plan_participants:${plan_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_participants',
          filter: `plan_id=eq.${plan_id}`,
        },
        (payload) => {
          console.log('Plan participant added:', payload)
          queryClient.invalidateQueries({ queryKey: ['plan-participants', plan_id] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'plan_participants',
          filter: `plan_id=eq.${plan_id}`,
        },
        (payload) => {
          console.log('Plan participant updated:', payload)
          queryClient.invalidateQueries({ queryKey: ['plan-participants', plan_id] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'plan_participants',
          filter: `plan_id=eq.${plan_id}`,
        },
        (payload) => {
          console.log('Plan participant removed:', payload)
          queryClient.invalidateQueries({ queryKey: ['plan-participants', plan_id] })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe().catch(console.error)
    }
  }, [plan_id, queryClient])

  return query
}