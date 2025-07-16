import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { GripVertical, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'

interface ResizableStopCardProps {
  stop: PlanStop
  isSelected?: boolean
  isResizing?: boolean
  onSelect?: (stopId: string, isMultiSelect?: boolean, isRangeSelect?: boolean) => void
  onStartResize?: (stopId: string, stop: PlanStop, clientY: number) => void
  onResize?: (clientY: number) => number | undefined
  onEndResize?: (clientY: number) => void
  className?: string
}

export function ResizableStopCard({
  stop,
  isSelected = false,
  isResizing = false,
  onSelect,
  onStartResize,
  onResize,
  onEndResize,
  className
}: ResizableStopCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewDuration, setPreviewDuration] = useState<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.resize-handle')) {
      return // Don't select when starting resize
    }
    
    const isMultiSelect = e.ctrlKey || e.metaKey
    const isRangeSelect = e.shiftKey
    onSelect?.(stop.id, isMultiSelect, isRangeSelect)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    onStartResize?.(stop.id, stop, e.clientY)

    const handleMouseMove = (e: MouseEvent) => {
      const duration = onResize?.(e.clientY)
      setPreviewDuration(duration || null)
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      setPreviewDuration(null)
      onEndResize?.(e.clientY)
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const duration = previewDuration || stop.duration_minutes || 60
  const cardHeight = Math.max(80, (duration / 60) * 80) // 80px per hour

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative rounded-xl border transition-all duration-200 select-none",
        isSelected 
          ? "border-primary bg-primary/10 ring-2 ring-primary/50" 
          : "border-border bg-card hover:border-primary/50",
        isDragging && "ring-2 ring-accent",
        className
      )}
      style={{ height: `${cardHeight}px` }}
      onMouseDown={handleMouseDown}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      layout
    >
      {/* Main content */}
      <div className="p-3 h-full flex flex-col">
        <div className="flex items-start gap-2 flex-1">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-medium text-sm truncate",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {stop.title}
            </h4>
            {stop.venue && (
              <p className="text-xs text-muted-foreground truncate">
                {stop.venue}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{duration}m</span>
          </div>
        </div>

        {/* Duration preview during resize */}
        {isDragging && previewDuration && (
          <div className="mt-2 text-xs text-accent font-medium">
            Adjusting to {previewDuration} minutes
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className={cn(
          "resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize",
          "flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity",
          "bg-gradient-to-t from-primary/20 to-transparent"
        )}
        onMouseDown={handleResizeStart}
      >
        <GripVertical className="w-3 h-3 text-primary" />
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
      )}
    </motion.div>
  )
}