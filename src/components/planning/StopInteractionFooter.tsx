import { memo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StopInteractionFooterProps {
  voteCounts: {
    upvote: number
    downvote: number
    maybe: number
  }
  userVote?: {
    vote_type: 'upvote' | 'downvote' | 'maybe'
  } | null
  onQuickVote: (type: 'upvote' | 'downvote' | 'maybe', emoji?: string) => Promise<void>
  isLoading: boolean
  showSwipeHint: boolean
  isBeingDragged: boolean
}

export const StopInteractionFooter = memo(({
  voteCounts,
  userVote,
  onQuickVote,
  isLoading,
  showSwipeHint,
  isBeingDragged
}: StopInteractionFooterProps) => {
  if (isBeingDragged) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ 
        opacity: showSwipeHint || userVote ? 1 : 0, 
        height: showSwipeHint || userVote ? 'auto' : 0 
      }}
      className="border-t border-border pt-2 mt-2 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant={userVote?.vote_type === 'upvote' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2"
            onClick={() => onQuickVote('upvote', '👍')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
            {voteCounts.upvote || 0}
          </Button>
          <Button
            variant={userVote?.vote_type === 'downvote' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2"
            onClick={() => onQuickVote('downvote', '👎')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ThumbsDown className="h-3 w-3 mr-1" />}
            {voteCounts.downvote || 0}
          </Button>
          <Button
            variant={userVote?.vote_type === 'maybe' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2"
            onClick={() => onQuickVote('maybe', '🤔')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <HelpCircle className="h-3 w-3 mr-1" />}
            {voteCounts.maybe || 0}
          </Button>
        </div>
        
        {showSwipeHint && !userVote && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Swipe to vote
          </span>
        )}
      </div>
    </motion.div>
  )
})

StopInteractionFooter.displayName = 'StopInteractionFooter'