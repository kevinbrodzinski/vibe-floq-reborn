import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'

interface StopCardBaseProps {
  stop: PlanStop
  isDragging?: boolean
  draggable?: boolean
  onEdit?: (stopId: string) => void
  onDelete?: (stopId: string) => void
  className?: string
}

export function StopCardBase({ 
  stop, 
  isDragging = false,
  draggable = false,
  onEdit,
  onDelete,
  className
}: StopCardBaseProps) {
  const draggableProps = useDraggable({ 
    id: stop.id,
    data: { stop }
  })

  const style = draggableProps.transform && draggable ? {
    transform: `translate3d(${draggableProps.transform.x}px, ${draggableProps.transform.y}px, 0)`,
  } : undefined

  const Component = draggable ? motion.div : 'div'

  return (
    <Component
      ref={draggable ? draggableProps.setNodeRef : undefined}
      style={style}
      {...(draggable ? draggableProps.listeners : {})}
      {...(draggable ? draggableProps.attributes : {})}
      className={cn(
        "p-3 rounded-xl bg-primary/10 border border-primary/20 transition-all duration-200",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 rotate-2 scale-105",
        className
      )}
      whileHover={draggable ? { scale: 1.02 } : undefined}
      whileTap={draggable ? { scale: 0.98 } : undefined}
      role="option"
      aria-selected={isDragging}
      aria-label={`Stop: ${stop.title}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{stop.title}</h4>
          </div>
          {stop.venue && (
            <p className="text-sm text-muted-foreground">
              {stop.venue}
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {stop.duration_minutes ?? 60}min
        </div>
      </div>
      
      {/* Action buttons for non-draggable mode */}
      {!draggable && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-2">
          {onEdit && (
            <button
              onClick={() => onEdit(stop.id)}
              className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(stop.id)}
              className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </Component>
  )
}