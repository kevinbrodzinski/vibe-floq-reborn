import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDragFeedback } from '@/hooks/useDragFeedback'

interface PullToRefreshCommentsProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  isRefreshing?: boolean
  threshold?: number
  className?: string
}

export function PullToRefreshComments({
  children,
  onRefresh,
  isRefreshing = false,
  threshold = 80,
  className
}: PullToRefreshCommentsProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragFeedback = useDragFeedback()
  
  const y = useMotionValue(0)
  const rotateZ = useTransform(y, [0, threshold], [0, 180])
  const opacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1])
  const scale = useTransform(y, [0, threshold], [0.8, 1])

  const handlePan = async (event: PointerEvent, info: PanInfo) => {
    const container = containerRef.current
    if (!container) return

    // Only allow pull-to-refresh if scrolled to top
    if (container.scrollTop > 10) return

    const deltaY = info.offset.y
    
    if (deltaY > 0) {
      setIsPulling(true)
      y.set(Math.min(deltaY, threshold * 1.5))
      
      // Trigger haptic feedback when threshold is reached
      if (deltaY >= threshold && !hasTriggered) {
        setHasTriggered(true)
        await dragFeedback.triggerDragEnd(true)
      }
    }
  }

  const handlePanEnd = async (event: PointerEvent, info: PanInfo) => {
    const deltaY = info.offset.y
    
    if (deltaY >= threshold && !isRefreshing) {
      try {
        await onRefresh()
        await dragFeedback.triggerDragEnd(true)
      } catch (error) {
        console.error('Refresh failed:', error)
      }
    }
    
    // Reset state
    y.set(0)
    setIsPulling(false)
    setHasTriggered(false)
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center"
        style={{
          y: useTransform(y, [0, threshold], [-50, 0]),
          opacity
        }}
      >
        <motion.div
          className="flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground"
          style={{ rotateZ, scale }}
        >
          <RefreshCw 
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              isRefreshing && "animate-spin"
            )} 
          />
        </motion.div>
      </motion.div>

      {/* Content with pan gesture */}
      <motion.div
        style={{ y }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  )
}