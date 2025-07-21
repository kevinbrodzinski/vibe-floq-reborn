import { useState } from 'react'
import { ThumbsUp, ThumbsDown, HelpCircle, MessageCircle, Smile } from 'lucide-react'
import { useStopVotes } from '@/hooks/useStopVotes'
import { useStopComments } from '@/hooks/useStopComments'
import { EmojiPicker } from '@/components/EmojiPicker'
import { cn } from '@/lib/utils'

interface StopInteractionPanelProps {
  planId: string
  stopId: string
  currentUserId: string | null
}

export function StopInteractionPanel({ planId, stopId, currentUserId }: StopInteractionPanelProps) {
  const [emoji, setEmoji] = useState<string | null>(null)
  const { votes, voteCounts, userVote, castVote } = useStopVotes({ planId, stopId })
  const { comments, addComment } = useStopComments({ planId, stopId })
  const [newComment, setNewComment] = useState('')

  const handleVote = (type: 'upvote' | 'downvote' | 'maybe') => {
    castVote({ voteType: type, emoji: emoji || undefined })
  }

  const handleCommentSubmit = () => {
    if (newComment.trim()) {
      addComment(newComment.trim())
      setNewComment('')
    }
  }

  return (
    <div className="bg-muted p-3 rounded-xl space-y-4">
      {/* Voting Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleVote('upvote')}
          className={cn(
            'flex items-center gap-1 text-sm hover:opacity-70 transition-opacity',
            userVote?.vote_type === 'upvote' && 'text-green-600 font-semibold'
          )}
        >
          <ThumbsUp size={16} /> {voteCounts.upvote || 0}
        </button>
        <button
          onClick={() => handleVote('maybe')}
          className={cn(
            'flex items-center gap-1 text-sm hover:opacity-70 transition-opacity',
            userVote?.vote_type === 'maybe' && 'text-yellow-600 font-semibold'
          )}
        >
          <HelpCircle size={16} /> {voteCounts.maybe || 0}
        </button>
        <button
          onClick={() => handleVote('downvote')}
          className={cn(
            'flex items-center gap-1 text-sm hover:opacity-70 transition-opacity',
            userVote?.vote_type === 'downvote' && 'text-red-600 font-semibold'
          )}
        >
          <ThumbsDown size={16} /> {voteCounts.downvote || 0}
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
            className="text-xs font-medium text-primary hover:opacity-70 transition-opacity"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}