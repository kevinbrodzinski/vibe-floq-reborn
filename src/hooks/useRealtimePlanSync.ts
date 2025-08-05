import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface RealtimePlanSyncOptions {
  plan_id: string
  onStopAdded?: (stop: any) => void
  onStopUpdated?: (stop: any) => void
  onStopRemoved?: (stop_id: string) => void
  onVoteCast?: (vote: any) => void
  onPlanFinalized?: (plan: any) => void
  onParticipantJoined?: (participant: any) => void
  onParticipantLeft?: (participant: any) => void
}

export function useRealtimePlanSync(options: RealtimePlanSyncOptions) {
  const queryClient = useQueryClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!options.plan_id) return

    // Create a channel for this specific plan
    const channel = supabase.channel(`plan:${options.plan_id}`)

    // Listen for database changes on plan-related tables
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_stops',
          filter: `plan_id=eq.${options.plan_id}`
        },
        (payload) => {
          console.log('Plan stops change:', payload)
          
          // Invalidate plan stops query
          queryClient.invalidateQueries({ queryKey: ['plan-stops', options.plan_id] })
          
          // Trigger callbacks
          if (payload.eventType === 'INSERT' && options.onStopAdded) {
            options.onStopAdded(payload.new)
          } else if (payload.eventType === 'UPDATE' && options.onStopUpdated) {
            options.onStopUpdated(payload.new)
          } else if (payload.eventType === 'DELETE' && options.onStopRemoved) {
            options.onStopRemoved(payload.old.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_votes',
          filter: `plan_id=eq.${options.plan_id}`
        },
        (payload) => {
          console.log('Plan votes change:', payload)
          
          // Invalidate plan votes query
          queryClient.invalidateQueries({ queryKey: ['plan-votes', options.plan_id] })
          
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && options.onVoteCast) {
            options.onVoteCast(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'floq_plans',
          filter: `id=eq.${options.plan_id}`
        },
        (payload) => {
          console.log('Plan update:', payload)
          
          // Invalidate plan query
          queryClient.invalidateQueries({ queryKey: ['floq-plans', options.plan_id] })
          
          if (payload.new.collaboration_status === 'finalized' && options.onPlanFinalized) {
            options.onPlanFinalized(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_participants',
          filter: `plan_id=eq.${options.plan_id}`
        },
        (payload) => {
          console.log('Plan participants change:', payload)
          
          // Invalidate plan participants query
          queryClient.invalidateQueries({ queryKey: ['plan-participants', options.plan_id] })
          
          if (payload.eventType === 'INSERT' && options.onParticipantJoined) {
            options.onParticipantJoined(payload.new)
          } else if (payload.eventType === 'DELETE' && options.onParticipantLeft) {
            options.onParticipantLeft(payload.old)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_activities',
          filter: `plan_id=eq.${options.plan_id}`
        },
        (payload) => {
          console.log('Plan activity added:', payload)
          
          // Invalidate plan activities query
          queryClient.invalidateQueries({ queryKey: ['plan-activities', options.plan_id] })
        }
      )

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Plan realtime subscription status: ${status}`)
    })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log(`Unsubscribing from plan:${options.plan_id}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [options.plan_id, queryClient])

  return {
    isConnected: !!channelRef.current,
    channel: channelRef.current
  }
}