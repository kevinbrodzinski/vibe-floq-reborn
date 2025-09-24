import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoteActivity } from '@/hooks/useVoteActivityTracker'

interface VoteActivityOverlayProps {
  activity: VoteActivity | null
  className?: string
}

export function VoteActivityOverlay({ activity, className }: VoteActivityOverlayProps) {
  if (!activity) return null

  const isUpvote = activity.vote === 'up'
  const Icon = isUpvote ? ThumbsUp : ThumbsDown

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        className={cn(
          'absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-lg',
          isUpvote 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-300' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/80 dark:text-red-300',
          className
        )}
      >
        <Icon className="w-3 h-3" />
        <span>{activity.username} voted</span>
      </motion.div>
    </AnimatePresence>
  )
}