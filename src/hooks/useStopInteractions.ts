import { useCallback } from 'react'
import { useStopVotes } from './useStopVotes'
import { useStopComments } from './useStopComments'
import { useToast } from '@/hooks/use-toast'
import { useDragFeedback } from './useDragFeedback'
import { useSession } from './useSession'
import { useGuestSession } from './useGuestSession'

interface UseStopInteractionsParams {
  planId: string
  stopId: string
  requireAuth?: boolean
}

export function useStopInteractions({ planId, stopId, requireAuth = false }: UseStopInteractionsParams) {
  const { toast } = useToast()
  const dragFeedback = useDragFeedback()
  const session = useSession()
  const { guestId, guestName } = useGuestSession()
  
  const isAuthenticated = !!session?.user
  const canInteract = isAuthenticated || !requireAuth
  
  const {
    votes,
    voteCounts: rawVoteCounts,
    userVote: rawUserVote,
    isLoading: votesLoading,
    castVote
  } = useStopVotes({ planId, stopId })

  // Type-safe vote counts with guaranteed properties
  const voteCounts = {
    upvote: rawVoteCounts?.upvote || 0,
    downvote: rawVoteCounts?.downvote || 0,
    maybe: rawVoteCounts?.maybe || 0
  }

  // Type-safe user vote with proper union type
  const userVote = (rawUserVote as any) ? {
    ...(rawUserVote as any),
    vote_type: (rawUserVote as any).vote_type as 'upvote' | 'downvote' | 'maybe'
  } : null

  const {
    comments,
    isLoading: commentsLoading,
    addComment
  } = useStopComments({ planId, stopId })

  const handleQuickVote = useCallback(async (voteType: 'upvote' | 'downvote' | 'maybe', emoji?: string) => {
    if (!canInteract) {
      toast({
        title: "Authentication required",
        description: "Please sign in to vote on stops",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      await castVote({ voteType, emoji })
      await dragFeedback.triggerDragEnd(true)
      
      const userDisplay = isAuthenticated ? 'You' : guestName || 'Anonymous'
      toast({
        title: "Vote cast!",
        description: `${userDisplay} voted ${voteType === 'upvote' ? '👍' : voteType === 'downvote' ? '👎' : '🤔'} on this stop`,
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
  }, [castVote, dragFeedback, toast, canInteract, isAuthenticated, guestName])

  const handleAddComment = useCallback(async (text: string) => {
    if (!text.trim()) return

    if (!canInteract) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment on stops",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      await addComment(text.trim())
      await dragFeedback.triggerDragEnd(true)
      
      const userDisplay = isAuthenticated ? 'Your' : `${guestName || 'Anonymous'}'s`
      toast({
        title: "Comment added!",
        description: `${userDisplay} comment has been posted`,
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
  }, [addComment, dragFeedback, toast, canInteract, isAuthenticated, guestName])

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
    
    // User state
    isAuthenticated,
    canInteract,
    guestId,
    guestName,
    
    // Loading states
    isLoading: votesLoading || commentsLoading
  }
}