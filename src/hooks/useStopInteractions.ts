import { useCallback } from 'react'
import { useStopVotes } from './useStopVotes'
import { useStopComments } from './useStopComments'
import { useToast } from '@/hooks/use-toast'
import { useDragFeedback } from './useDragFeedback'

interface UseStopInteractionsParams {
  planId: string
  stopId: string
}

export function useStopInteractions({ planId, stopId }: UseStopInteractionsParams) {
  const { toast } = useToast()
  const dragFeedback = useDragFeedback()
  
  const {
    votes,
    voteCounts,
    userVote,
    isLoading: votesLoading,
    castVote
  } = useStopVotes({ planId, stopId })

  const {
    comments,
    isLoading: commentsLoading,
    addComment
  } = useStopComments({ planId, stopId })

  const handleQuickVote = useCallback(async (voteType: 'upvote' | 'downvote' | 'maybe', emoji?: string) => {
    try {
      await castVote({ voteType, emoji })
      await dragFeedback.triggerDragEnd(true)
      
      toast({
        title: "Vote cast!",
        description: `You voted ${voteType === 'upvote' ? '👍' : voteType === 'downvote' ? '👎' : '🤔'} on this stop`,
        duration: 2000,
      })
    } catch (error) {
      console.error('Vote failed:', error)
      toast({
        title: "Vote failed",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      })
    }
  }, [castVote, dragFeedback, toast])

  const handleAddComment = useCallback(async (text: string) => {
    if (!text.trim()) return

    try {
      await addComment(text.trim())
      await dragFeedback.triggerDragEnd(true)
      
      toast({
        title: "Comment added!",
        description: "Your comment has been posted",
        duration: 2000,
      })
    } catch (error) {
      console.error('Comment failed:', error)
      toast({
        title: "Comment failed",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      })
    }
  }, [addComment, dragFeedback, toast])

  return {
    // Voting
    votes,
    voteCounts,
    userVote,
    votesLoading,
    handleQuickVote,
    
    // Comments
    comments,
    commentsLoading,
    handleAddComment,
    
    // Loading states
    isLoading: votesLoading || commentsLoading
  }
}