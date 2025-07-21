
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, DollarSign, MoreVertical, Edit, Trash2, GripVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDragFeedback } from '@/hooks/useDragFeedback'

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
  onEdit?: (stop: any) => void
  onDelete?: (stopId: string) => void
  isDragging?: boolean
}

export function DraggableStopCard({ 
  stop, 
  onEdit, 
  onDelete, 
  isDragging = false
}: DraggableStopCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const dragFeedback = useDragFeedback()

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

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getDurationText = (minutes?: number) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200 group",
        isBeingDragged
          ? 'shadow-lg scale-105 rotate-1 border-primary z-50' 
          : 'shadow-sm hover:shadow-md border-border'
      )}
    >
      <CardContent className="p-4">
        {/* Header with drag handle and menu */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <motion.button 
              {...attributes}
              {...listeners}
              className="cursor-grab hover:text-primary touch-none active:cursor-grabbing transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Drag to reorder stop"
              tabIndex={0}
              onPointerDown={handleDragStart}
              onPointerUp={handleDragEnd}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <GripVertical className="h-4 w-4" />
            </motion.button>
            
            <div className="flex-1">
              <h3 className="font-medium text-sm leading-tight">{stop.title}</h3>
              {stop.venue && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {stop.venue.name}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200"
                aria-label="Stop options"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(stop)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(stop.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Time and duration */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(stop.start_time)} - {formatTime(stop.end_time)}
          </Badge>
          
          {stop.duration_minutes && (
            <Badge variant="secondary" className="text-xs">
              {getDurationText(stop.duration_minutes)}
            </Badge>
          )}
        </div>

        {/* Cost */}
        {stop.estimated_cost_per_person && (
          <div className="flex items-center gap-1 mb-2">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              ~${stop.estimated_cost_per_person}/person
            </span>
          </div>
        )}

        {/* Description */}
        {stop.description && (
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
      </CardContent>
    </Card>
  )
}
