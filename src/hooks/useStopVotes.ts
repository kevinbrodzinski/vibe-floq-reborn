import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { useGuestSession } from '@/hooks/useGuestSession'

interface UseStopVotesParams {
  planId: string
  stopId: string
}

export function useStopVotes({ planId, stopId }: UseStopVotesParams) {
  const session = useSession()
  const { guestId } = useGuestSession()
  const queryClient = useQueryClient()

  const { data: votes = [], isLoading } = useQuery({
    queryKey: ['stop-votes', planId, stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_stop_votes')
        .select('*')
        .eq('plan_id', planId)
        .eq('stop_id', stopId)

      if (error) throw error
      return data || []
    },
    enabled: !!planId && !!stopId,
  })

  const { mutateAsync: castVote } = useMutation({
    mutationFn: async ({ voteType, emoji }: { voteType: 'upvote' | 'downvote' | 'maybe', emoji?: string }) => {
      const profile_id = session?.user?.id || null

      const { error } = await supabase
        .from('plan_stop_votes')
        .upsert({
          plan_id: planId,
          stop_id: stopId,
          profile_id,
          guest_id: guestId || null,
          vote_type: voteType,
          emoji_reaction: emoji || null,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-votes', planId, stopId] })
    },
  })

  // Calculate vote counts and user's current vote
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.vote_type] = (acc[vote.vote_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userVote = votes.find(vote => 
    session?.user?.id ? vote.profile_id === session.user.id : vote.guest_id === guestId
  )

  return {
    votes,
    voteCounts,
    userVote,
    isLoading,
    castVote,
  }
}