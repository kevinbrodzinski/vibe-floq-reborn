import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { usePlanVote, useStopVotes } from '@/hooks/usePlanVote'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation'
import { getSafeStatus } from '@/lib/planStatusConfig'

interface VoteButtonsProps {
  planId: string
  stopId: string
  planStatus?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showCounts?: boolean
}

export function VoteButtons({ 
  planId, 
  stopId, 
  planStatus,
  className, 
  size = 'sm',
  showCounts = true 
}: VoteButtonsProps) {
  const { user } = useAuth()
  const { data: votes = [] } = useStopVotes(stopId)
  const { mutate: vote, isPending } = usePlanVote()
  const [optimisticVote, setOptimisticVote] = useState<'up' | 'down' | null>(null)
  const { canVoteOnStops } = usePlanStatusValidation()

  const userVote = user 
    ? (votes.find(v => (v as any).profile_id === user.id) as any)?.vote_type 
    : null

  // Calculate vote counts
  const upVotes = votes.filter(v => (v as any).vote_type === 'up').length
  const downVotes = votes.filter(v => (v as any).vote_type === 'down').length

  const handleVote = (voteType: 'up' | 'down') => {
    if (!user) return

    setOptimisticVote(voteType)
    
    vote(
      { plan_id: planId, stop_id: stopId, vote_type: voteType },
      {
        onSettled: () => setOptimisticVote(null),
      }
    )
  }

  const currentVote = optimisticVote || userVote
  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'

  // Don't show if user not authenticated or voting not allowed for this plan status
  const normalizedStatus = getSafeStatus(planStatus)
  if (!user || !canVoteOnStops(normalizedStatus)) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant={currentVote === 'up' ? 'default' : 'ghost'}
        size={buttonSize}
        onClick={() => handleVote('up')}
        disabled={isPending}
        aria-label="Vote up"
        title="Vote up"
        className={cn(
          'gap-1 transition-colors',
          currentVote === 'up' && 'bg-green-500 hover:bg-green-600 text-white'
        )}
      >
        <ThumbsUp className={cn(
          size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        )} />
        {showCounts && upVotes > 0 && (
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
            {upVotes}
          </Badge>
        )}
      </Button>

      <Button
        variant={currentVote === 'down' ? 'default' : 'ghost'}
        size={buttonSize}
        onClick={() => handleVote('down')}
        disabled={isPending}
        aria-label="Vote down"
        title="Vote down"
        className={cn(
          'gap-1 transition-colors',
          currentVote === 'down' && 'bg-red-500 hover:bg-red-600 text-white'
        )}
      >
        <ThumbsDown className={cn(
          size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        )} />
        {showCounts && downVotes > 0 && (
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
            {downVotes}
          </Badge>
        )}
      </Button>
    </div>
  )
}