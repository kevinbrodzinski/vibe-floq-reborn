import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface SubmitVoteParams {
  plan_id: string
  stop_id: string
  vote_type: 'love' | 'like' | 'neutral' | 'dislike' | 'veto'
  emoji_reaction?: string
  comment?: string
}

export function usePlanVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: SubmitVoteParams) => {
      const { data, error } = await supabase.functions.invoke('submit-plan-vote', {
        body: params
      })
      
      if (error) {
        console.error('Vote submission error:', error)
        throw new Error(error.message || 'Failed to submit vote')
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
        description: error.message || "Something went wrong. Please try again.",
      })
    }
  })
}