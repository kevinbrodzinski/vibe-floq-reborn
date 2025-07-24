import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, DollarSign, Edit, Trash2, GripVertical, MoreVertical, CheckCircle2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface StopCardHeaderProps {
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
  dragProps: any
  compact?: boolean
  venueStatus?: 'enroute' | 'arrived' | 'departed'
}

export const StopCardHeader = memo(({
  stop,
  onEdit,
  onDelete,
  dragProps,
  compact = false,
  venueStatus = 'enroute'
}: StopCardHeaderProps) => {
  // Memoized time formatting
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
    <>
      {/* Header with drag handle and menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <motion.button 
            {...dragProps.attributes}
            {...dragProps.listeners}
            className="cursor-grab hover:text-primary touch-none active:cursor-grabbing transition-colors duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Drag to reorder stop"
            tabIndex={0}
            onPointerDown={dragProps.onDragStart}
            onPointerUp={dragProps.onDragEnd}
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
          {formattedStartTime} - {formattedEndTime}
        </Badge>
        
        {durationText && (
          <Badge variant="secondary" className="text-xs">
            {durationText}
          </Badge>
        )}

        {/* Venue status badge */}
        <Badge 
          variant={venueStatus === 'arrived' ? 'default' : 'outline'}
          className={cn(
            "text-xs flex items-center gap-1",
            venueStatus === 'arrived' && "bg-green-500 text-white border-green-500",
            venueStatus === 'departed' && "bg-orange-500 text-white border-orange-500"
          )}
        >
          {venueStatus === 'arrived' && <CheckCircle2 className="h-3 w-3" />}
          {venueStatus === 'arrived' ? 'Arrived' : venueStatus === 'departed' ? 'Departed' : 'En-route'}
        </Badge>
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
    </>
  )
})

StopCardHeader.displayName = 'StopCardHeader'