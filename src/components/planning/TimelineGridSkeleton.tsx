import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { zIndex } from '@/constants/z'

interface TimelineGridSkeletonProps {
  timeSlots?: number
  className?: string
}

export function TimelineGridSkeleton({ 
  timeSlots = 6, 
  className 
}: TimelineGridSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Collaboration Header Skeleton */}
      <div className="flex items-center justify-between p-3 bg-card/30 rounded-lg border animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded-full" />
          <div className="w-20 h-3 bg-muted rounded" />
        </div>
        <div className="w-16 h-6 bg-muted rounded" />
      </div>

      {/* Time Slots Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: timeSlots }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 min-h-[80px] p-4 rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm"
          >
            {/* Time label skeleton */}
            <div className="w-16">
              <div className="w-12 h-4 bg-muted rounded animate-pulse" />
            </div>
            
            {/* Stop content skeleton */}
            <div className="flex-1">
              {i % 3 === 0 ? (
                // Skeleton for time slots with stops
                <div className="space-y-2">
                  <div className="h-16 bg-muted/50 rounded-xl animate-pulse flex items-center gap-3 p-3">
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="w-24 h-3 bg-muted rounded" />
                      <div className="w-32 h-2 bg-muted/70 rounded" />
                    </div>
                    <div className="w-6 h-6 bg-muted rounded" />
                  </div>
                </div>
              ) : (
                // Skeleton for empty time slots
                <div className="h-16 border-2 border-dashed border-muted/30 rounded-xl flex items-center justify-center">
                  <div className="w-16 h-3 bg-muted/50 rounded animate-pulse" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Specialized skeleton for drag operations
export function DragOperationSkeleton() {
  return (
    <div {...zIndex('overlay')} className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-6 border shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-primary rounded animate-spin" />
          <span className="text-sm font-medium">Updating timeline...</span>
        </div>
      </motion.div>
    </div>
  )
}