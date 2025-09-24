import { useState, memo } from 'react'
import { ThumbsUp, ThumbsDown, HelpCircle, MessageCircle, Smile, Loader2 } from 'lucide-react'
import { useStopVotes } from '@/hooks/useStopVotes'
import { useStopComments } from '@/hooks/useStopComments'
import { EmojiPicker } from '@/components/EmojiPicker'
import { cn } from '@/lib/utils'
import { InteractionsPanelSkeleton } from '@/components/skeletons/PlanTimelineSkeletons'
import { useStopInteractions } from '@/hooks/useStopInteractions'

interface StopInteractionPanelProps {
  planId: string
  stopId: string
  currentUserId: string | null
  requireAuth?: boolean
  onAuthPrompt?: () => void
}

const StopInteractionPanelComponent = ({ planId, stopId, currentUserId }: StopInteractionPanelProps) => {
  const [emoji, setEmoji] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  
  const {
    voteCounts,
    userVote,
    handleQuickVote,
    comments,
    handleAddComment,
    isLoading
  } = useStopInteractions({ planId, stopId })

  // Show skeleton while loading
  if (isLoading) {
    return <InteractionsPanelSkeleton />
  }

  const handleVote = async (type: 'upvote' | 'downvote' | 'maybe') => {
    await handleQuickVote(type, emoji || undefined)
    setEmoji(null) // Clear emoji after voting
  }

  const handleCommentSubmit = async () => {
    if (newComment.trim()) {
      await handleAddComment(newComment.trim())
      setNewComment('')
    }
  }

  return (
    <div className="bg-muted p-3 rounded-xl space-y-4">
      {/* Voting Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleVote('upvote')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1 text-sm hover:opacity-70 transition-opacity disabled:opacity-50',
            userVote?.vote_type === 'upvote' && 'text-green-600 font-semibold'
          )}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />} 
          {voteCounts.upvote || 0}
        </button>
        <button
          onClick={() => handleVote('maybe')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1 text-sm hover:opacity-70 transition-opacity disabled:opacity-50',
            userVote?.vote_type === 'maybe' && 'text-yellow-600 font-semibold'
          )}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <HelpCircle size={16} />} 
          {voteCounts.maybe || 0}
        </button>
        <button
          onClick={() => handleVote('downvote')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1 text-sm hover:opacity-70 transition-opacity disabled:opacity-50',
            userVote?.vote_type === 'downvote' && 'text-red-600 font-semibold'
          )}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />} 
          {voteCounts.downvote || 0}
        </button>

        {/* Emoji */}
        <EmojiPicker
          selected={emoji}
          onChange={setEmoji}
          className="ml-auto text-muted-foreground"
          icon={<Smile size={16} />}
        />
      </div>

      {/* Comments Section */}
      <div>
        <div className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-1">
          <MessageCircle size={14} /> Comments
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="bg-background p-2 rounded-lg text-sm">
              <span className="font-semibold">
                {c.guest_name || 'Anonymous'}:
              </span>{' '}
              {c.text}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="flex-1 rounded-lg border bg-background px-3 py-1 text-sm"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
          />
          <button 
            onClick={handleCommentSubmit} 
            disabled={isLoading || !newComment.trim()}
            className="text-xs font-medium text-primary hover:opacity-70 transition-opacity disabled:opacity-50 flex items-center gap-1"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Post
          </button>
        </div>
      </div>
    </div>
  )
}

// Memoized component for performance optimization
export const StopInteractionPanel = memo(StopInteractionPanelComponent, (prevProps, nextProps) => {
  return (
    prevProps.planId === nextProps.planId &&
    prevProps.stopId === nextProps.stopId &&
    prevProps.currentUserId === nextProps.currentUserId
  )
})