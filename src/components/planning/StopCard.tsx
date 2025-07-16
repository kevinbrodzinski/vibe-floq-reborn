import { useState } from 'react'
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

interface StopCardProps {
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
  dragHandleProps?: any
}

export function StopCard({ 
  stop, 
  onEdit, 
  onDelete, 
  isDragging = false,
  dragHandleProps 
}: StopCardProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)

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
      className={`relative transition-all duration-200 ${
        isDragging 
          ? 'shadow-lg scale-105 rotate-2 border-primary' 
          : 'shadow-sm hover:shadow-md border-border'
      }`}
    >
      <CardContent className="p-4">
        {/* Header with drag handle and menu */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            {dragHandleProps && (
              <button 
                {...dragHandleProps}
                className="cursor-grab hover:text-primary touch-none"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            
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
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Time and duration */}
        <div className="flex items-center gap-2 mb-2">
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
          <div className="text-xs text-muted-foreground">
            {showFullDescription || stop.description.length <= 100 ? (
              <span>{stop.description}</span>
            ) : (
              <>
                <span>{stop.description.substring(0, 100)}...</span>
                <button
                  onClick={() => setShowFullDescription(true)}
                  className="text-primary hover:underline ml-1"
                >
                  more
                </button>
              </>
            )}
            {showFullDescription && stop.description.length > 100 && (
              <button
                onClick={() => setShowFullDescription(false)}
                className="text-primary hover:underline ml-1"
              >
                less
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}