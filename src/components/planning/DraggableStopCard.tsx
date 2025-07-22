
import { useState, memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, DollarSign, MoreVertical, Edit, Trash2, GripVertical, ThumbsUp, ThumbsDown, HelpCircle, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDragFeedback } from '@/hooks/useDragFeedback'
import { useSwipeGestures } from '@/hooks/useSwipeGestures'
import { useStopInteractions } from '@/hooks/useStopInteractions'
import { StopCardSkeleton } from '@/components/skeletons/PlanTimelineSkeletons'
import { StopCardHeader } from './StopCardHeader'
import { StopInteractionFooter } from './StopInteractionFooter'

interface DraggableStopCardProps {
  stop: {
    id: string
    title: string
    description?: string
    start_time: string
    end_time: string
    duration_minutes?: number
    estimated_cost_per_person?: number
    venue?: {
      id: string
      name: string
      address?: string
    }
  }
  planId: string
  onEdit?: (stop: any) => void
  onDelete?: (stopId: string) => void
  isDragging?: boolean
  showQuickActions?: boolean
  compact?: boolean
}

const DraggableStopCardComponent = ({ 
  stop, 
  planId,
  onEdit, 
  onDelete, 
  isDragging = false,
  showQuickActions = true,
  compact = false
}: DraggableStopCardProps) => {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const dragFeedback = useDragFeedback()
  
  const {
    voteCounts,
    userVote,
    handleQuickVote,
    isLoading
  } = useStopInteractions({ planId, stopId: stop.id })

  // Show skeleton while loading interactions
  if (isLoading) {
    return <StopCardSkeleton compact={compact} />
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    active,
    isDragging: sortableIsDragging,
  } = useSortable({ 
    id: stop.id,
    data: { stop }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isBeingDragged = active?.id === stop.id || isDragging || sortableIsDragging

  const handleDragStart = () => {
    dragFeedback.triggerDragStart()
  }

  const handleDragEnd = () => {
    dragFeedback.triggerDragEnd(true)
  }

  // Swipe gestures for quick voting
  const swipeGestures = useSwipeGestures({
    onSwipeRight: () => handleQuickVote('upvote', '👍'),
    onSwipeLeft: () => handleQuickVote('downvote', '👎'),
    onSwipeUp: () => handleQuickVote('maybe', '🤔'),
    threshold: 80,
    hapticFeedback: true
  })

  // Memoized time formatting to prevent unnecessary recalculations
  const formattedStartTime = useMemo(() => {
    const [hours, minutes] = stop.start_time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }, [stop.start_time])

  const formattedEndTime = useMemo(() => {
    const [hours, minutes] = stop.end_time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }, [stop.end_time])

  const durationText = useMemo(() => {
    const minutes = stop.duration_minutes
    if (!minutes) return null
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }, [stop.duration_minutes])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card 
        ref={setNodeRef}
        style={style}
        {...(showQuickActions ? swipeGestures.bind() : {})}
        className={cn(
          "relative transition-all duration-200 group touch-pan-y select-none",
          isBeingDragged
            ? 'shadow-lg scale-105 rotate-1 border-primary' 
            : 'shadow-sm hover:shadow-md border-border',
          compact && 'p-2'
        )}
        onMouseEnter={() => setShowSwipeHint(true)}
        onMouseLeave={() => setShowSwipeHint(false)}
      >
        <CardContent className="p-4">
          <StopCardHeader
            stop={stop}
            onEdit={onEdit}
            onDelete={onDelete}
            dragProps={{
              attributes,
              listeners,
              onDragStart: handleDragStart,
              onDragEnd: handleDragEnd
            }}
            compact={compact}
          />

          {/* Description */}
          {stop.description && !compact && (
            <motion.div 
              className="text-xs text-muted-foreground"
              initial={false}
              animate={{ height: 'auto' }}
            >
              {showFullDescription || stop.description.length <= 100 ? (
                <span>{stop.description}</span>
              ) : (
                <>
                  <span>{stop.description.substring(0, 100)}...</span>
                  <button
                    onClick={() => setShowFullDescription(true)}
                    className="text-primary hover:underline ml-1 focus:underline focus:outline-none"
                    aria-label="Show full description"
                  >
                    more
                  </button>
                </>
              )}
              {showFullDescription && stop.description.length > 100 && (
                <button
                  onClick={() => setShowFullDescription(false)}
                  className="text-primary hover:underline ml-1 focus:underline focus:outline-none"
                  aria-label="Show less description"
                >
                  less
                </button>
              )}
            </motion.div>
          )}

          {/* Quick Actions Bar */}
          {showQuickActions && (
            <StopInteractionFooter
              voteCounts={voteCounts}
              userVote={userVote}
              onQuickVote={handleQuickVote}
              isLoading={isLoading}
              showSwipeHint={showSwipeHint}
              isBeingDragged={isBeingDragged}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Memoized component for performance optimization
export const DraggableStopCard = memo(DraggableStopCardComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.stop.id === nextProps.stop.id &&
    prevProps.stop.title === nextProps.stop.title &&
    prevProps.stop.start_time === nextProps.stop.start_time &&
    prevProps.stop.end_time === nextProps.stop.end_time &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.showQuickActions === nextProps.showQuickActions &&
    prevProps.compact === nextProps.compact
  )
})
