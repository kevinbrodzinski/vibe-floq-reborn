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
        .eq('plan_id', planId as any)
        .eq('stop_id', stopId as any)
        .returns<any>()

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
        } as any)
        .returns<any>()

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stop-votes', planId, stopId] })
    },
  })

  // Calculate vote counts and user's current vote
  const voteCounts = (votes as any)?.reduce((acc: any, vote: any) => {
    acc[vote.vote_type] = (acc[vote.vote_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const userVote = (votes as any)?.find((vote: any) => 
    session?.user?.id ? (vote as any).profile_id === session.user.id : (vote as any).guest_id === guestId
  )

  return {
    votes,
    voteCounts,
    userVote,
    isLoading,
    castVote,
  }
}