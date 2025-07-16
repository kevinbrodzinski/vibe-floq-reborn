import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SubmitVoteParams {
  plan_id: string
  stop_id: string
  vote_type: 'up' | 'down'
  emoji_reaction?: string
  comment?: string
}

interface VoteResponse {
  success: true
  vote: any
}

export function usePlanVote() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation<VoteResponse, Error, SubmitVoteParams>({
    mutationFn: async (params: SubmitVoteParams) => {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('plan_votes')
        .upsert(
          {
            plan_id: params.plan_id,
            stop_id: params.stop_id,
            user_id: user.user.id,
            vote_type: params.vote_type,
            comment: params.comment || null,
            emoji_reaction: params.emoji_reaction || null,
          },
          {
            onConflict: 'plan_id,stop_id,user_id',
          }
        )
        .select()

      if (error) {
        console.error('Vote submission error:', error)
        throw error
      }

      return { success: true, vote: data }
    },
    onSuccess: (data, variables) => {
      // Invalidate plan-related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['plan-votes', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['stop-votes', variables.stop_id] })
      
      toast({
        title: "Vote submitted",
        description: `Your ${variables.vote_type === 'up' ? '👍' : '👎'} vote has been recorded.`,
      })
    },
    onError: (error) => {
      console.error('Vote submission failed:', error)
      toast({
        variant: "destructive",
        title: "Failed to submit vote",
        description: error?.message ?? "Something went wrong. Please try again.",
      })
    }
  })
}

export function useStopVotes(stopId: string) {
  return useQuery({
    queryKey: ['stop-votes', stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_votes')
        .select(`
          *,
          user:profiles(display_name, username, avatar_url)
        `)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch stop votes:', error)
        throw error
      }

      return data || []
    },
    enabled: !!stopId,
  })
}