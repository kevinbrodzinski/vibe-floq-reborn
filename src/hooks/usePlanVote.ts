import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SubmitVoteParams {
  plan_id: string
  stop_id: string
  vote_type: 'love' | 'like' | 'neutral' | 'dislike' | 'veto'
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
      const { data, error } = await supabase.functions.invoke('submit-plan-vote', {
        body: params
      })
      
      if (error) {
        console.error('Vote submission error:', error)
        const message = error?.message ?? error?.error?.message ?? 'Something went wrong on the server'
        throw new Error(message)
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate plan-related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['plan-votes', variables.plan_id] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.plan_id] })
      
      toast({
        title: "Vote submitted",
        description: `Your ${variables.vote_type} vote has been recorded.`,
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