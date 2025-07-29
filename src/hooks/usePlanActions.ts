import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface AddStopParams {
  planId: string
  title: string
  description?: string
  venueId?: string
  timeSlot?: string
}

interface RemoveStopParams {
  planId: string
  stopId: string
}

interface VoteOnStopParams {
  planId: string
  stopId: string
  voteType: 'up' | 'down' | 'maybe'
  emojiReaction?: string
}

export function useAddStop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<any, Error, AddStopParams>({
    mutationFn: async ({ planId, title, description, venueId, timeSlot }: AddStopParams) => {
      const { data, error } = await supabase
        .from('plan_stops')
        .insert({
          plan_id: planId,
          title,
          description,
          venue_id: venueId,
          start_time: timeSlot ? `${timeSlot}:00` : undefined,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          stop_order: 1 // Will be updated by the legacy wrapper
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['floq-activity', variables.planId] })
      toast({
        title: 'Stop added',
        description: 'Successfully added stop to plan',
      })
    },
    onError: (error) => {
      console.error('Failed to add stop:', error)
      toast({
        title: 'Failed to add stop',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export function useRemoveStop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<void, Error, RemoveStopParams>({
    mutationFn: async ({ planId, stopId }: RemoveStopParams) => {
      const { error } = await supabase
        .from('plan_stops')
        .delete()
        .eq('id', stopId)
        .eq('plan_id', planId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['floq-activity', variables.planId] })
      toast({
        title: 'Stop removed',
        description: 'Successfully removed stop from plan',
      })
    },
    onError: (error) => {
      console.error('Failed to remove stop:', error)
      toast({
        title: 'Failed to remove stop',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })
}

export function useVoteOnStop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<any, Error, VoteOnStopParams>({
    mutationFn: async ({ planId, stopId, voteType, emojiReaction }: VoteOnStopParams) => {
      const { data, error } = await supabase
        .from('plan_votes')
        .upsert({
          plan_id: planId,
          stop_id: stopId,
          vote_type: voteType,
          emoji_reaction: emojiReaction,
          profile_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-votes', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['floq-activity', variables.planId] })
    },
    onError: (error) => {
      console.error('Failed to vote on stop:', error)
      toast({
        title: 'Failed to vote',
        description: 'Please try again.',
        variant: 'destructive',
      })
    },
  })
}