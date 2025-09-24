import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

// Enhanced shimmer animation for skeleton states
const shimmerAnimation = {
  backgroundPosition: ['200% 0', '-200% 0'],
  transition: {
    duration: 1.5,
    ease: [0.4, 0, 0.6, 1] as const, // Cubic bezier easing
    repeat: Infinity,
    repeatType: 'loop' as const
  }
}

const ShimmerSkeleton = ({ className = '', ...props }: { className?: string }) => (
  <motion.div
    animate={shimmerAnimation}
    className={`bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded-md ${className}`}
    style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)' }}
    {...props}
  />
)

interface StopCardSkeletonProps {
  compact?: boolean
  count?: number
}

export const StopCardSkeleton = ({ compact = false, count = 1 }: StopCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative border rounded-lg p-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <ShimmerSkeleton className="h-4 w-4" />
              <div className="flex-1 space-y-1">
                <ShimmerSkeleton className="h-4 w-32" />
                <ShimmerSkeleton className="h-3 w-24" />
              </div>
            </div>
            <ShimmerSkeleton className="h-6 w-6" />
          </div>

          {/* Time badges */}
          <div className="flex items-center gap-2 mb-2">
            <ShimmerSkeleton className="h-5 w-20" />
            <ShimmerSkeleton className="h-5 w-12" />
          </div>

          {/* Cost */}
          <div className="flex items-center gap-1 mb-2">
            <ShimmerSkeleton className="h-3 w-3" />
            <ShimmerSkeleton className="h-3 w-16" />
          </div>

          {/* Description - only if not compact */}
          {!compact && (
            <div className="space-y-1">
              <ShimmerSkeleton className="h-3 w-full" />
              <ShimmerSkeleton className="h-3 w-3/4" />
            </div>
          )}

          {/* Quick actions hint */}
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <ShimmerSkeleton className="h-6 w-12" />
                <ShimmerSkeleton className="h-6 w-12" />
                <ShimmerSkeleton className="h-6 w-12" />
              </div>
              <ShimmerSkeleton className="h-3 w-16" />
            </div>
          </div>
        </motion.div>
      ))}
    </>
  )
}

interface TimelineGridSkeletonProps {
  timeSlots?: number
  compact?: boolean
}

export const TimelineGridSkeleton = ({ timeSlots = 8, compact = false }: TimelineGridSkeletonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <ShimmerSkeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-8 w-16" />
          <ShimmerSkeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Time slots grid */}
      <div className="space-y-2">
        {Array.from({ length: timeSlots }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4"
          >
            {/* Time label */}
            <ShimmerSkeleton className="h-4 w-16 flex-shrink-0" />
            
            {/* Drop zone */}
            <div className="flex-1 min-h-[80px] border-2 border-dashed border-muted rounded-lg p-2">
              {i % 3 === 0 && <StopCardSkeleton compact={compact} />}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export const InteractionsPanelSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-muted p-3 rounded-xl space-y-4 animate-pulse"
    >
      {/* Voting section */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-6 w-12" />
          <ShimmerSkeleton className="h-6 w-12" />
          <ShimmerSkeleton className="h-6 w-12" />
        </div>
        <ShimmerSkeleton className="h-6 w-6 ml-auto" />
      </div>

      {/* Comments section */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <ShimmerSkeleton className="h-4 w-4" />
          <ShimmerSkeleton className="h-4 w-16" />
        </div>
        
        {/* Comment list */}
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background p-2 rounded-lg">
              <div className="flex items-start gap-2">
                <ShimmerSkeleton className="h-3 w-16" />
                <ShimmerSkeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="flex-1 h-8" />
          <ShimmerSkeleton className="h-8 w-12" />
        </div>
      </div>
    </motion.div>
  )
}