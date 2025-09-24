import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { MapPin, Star, DollarSign, Clock, Users, Plus, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Venue {
  id: string
  name: string
  address?: string
  categories?: string[]
  rating?: number
  price_tier?: string
  photo_url?: string
  distance_meters?: number
  match_score?: number
}

interface VenueDropZoneProps {
  timeSlot: string
  onVenueDrop: (venue: Venue, timeSlot: string) => void
  isActive?: boolean
  className?: string
}

export function VenueDropZone({ 
  timeSlot, 
  onVenueDrop, 
  isActive = false,
  className 
}: VenueDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const { isOver, setNodeRef } = useDroppable({
    id: `venue-drop-${timeSlot}`,
    data: {
      type: 'venue-drop-zone',
      timeSlot
    }
  })

  const handleVenueClick = (venue: Venue) => {
    onVenueDrop(venue, timeSlot)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-lg border-2 border-dashed",
        isOver && "border-primary bg-primary/10 scale-105",
        isActive && "border-primary/50 bg-primary/5",
        !isOver && !isActive && "border-border/30 bg-transparent",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4 text-center">
        <motion.div
          animate={{ 
            scale: isOver ? 1.1 : 1,
            rotate: isOver ? [0, -5, 5, 0] : 0
          }}
          transition={{ duration: 0.2 }}
        >
          <MapPin className={cn(
            "w-8 h-8 mx-auto mb-2 transition-colors",
            isOver ? "text-primary" : "text-muted-foreground"
          )} />
        </motion.div>
        
        <p className={cn(
          "text-sm transition-colors",
          isOver ? "text-primary font-medium" : "text-muted-foreground"
        )}>
          {isOver ? `Drop venue here for ${timeSlot}` : `Drop venue for ${timeSlot}`}
        </p>
        
        {isHovered && !isOver && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground mt-1"
          >
            Drag venues from recommendations
          </motion.p>
        )}
      </div>
    </div>
  )
}

// Draggable venue card for recommendations panel
interface DraggableVenueCardProps {
  venue: Venue
  onSelect?: (venue: Venue) => void
  compact?: boolean
  showMatchScore?: boolean
}

export function DraggableVenueCard({ 
  venue, 
  onSelect, 
  compact = false,
  showMatchScore = true
}: DraggableVenueCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  const formatDistance = (meters?: number) => {
    if (!meters) return null
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const getPriceTierIcon = (tier?: string) => {
    switch (tier) {
      case '$': return '$'
      case '$$': return '$$'
      case '$$$': return '$$$'
      case '$$$$': return '$$$$'
      default: return '?'
    }
  }

  return (
    <motion.div
      layout
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{ scale: 1.05, rotate: 2, zIndex: 50 }}
      className={cn(
        "cursor-move select-none",
        isDragging && "opacity-75"
      )}
    >
      <Card className={cn(
        "transition-all duration-200 hover:shadow-md border",
        isDragging && "shadow-lg border-primary",
        compact ? "p-3" : "p-4"
      )}>
        <CardContent className={cn("p-0", compact && "space-y-2")}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-medium truncate",
                compact ? "text-sm" : "text-base"
              )}>
                {venue.name}
              </h3>
              
              {venue.address && (
                <p className={cn(
                  "text-muted-foreground truncate",
                  compact ? "text-xs" : "text-sm"
                )}>
                  {venue.address}
                </p>
              )}
            </div>
            
            {showMatchScore && venue.match_score && (
              <Badge 
                variant="secondary" 
                className={cn("flex-shrink-0", compact && "text-xs")}
              >
                {Math.round(venue.match_score)}%
              </Badge>
            )}
          </div>

          {/* Categories */}
          {venue.categories && venue.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {venue.categories.slice(0, compact ? 2 : 3).map((category, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={cn("text-xs", compact && "px-1 py-0")}
                >
                  {category}
                </Badge>
              ))}
              {venue.categories.length > (compact ? 2 : 3) && (
                <Badge variant="outline" className="text-xs">
                  +{venue.categories.length - (compact ? 2 : 3)}
                </Badge>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {venue.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{venue.rating.toFixed(1)}</span>
                </div>
              )}
              
              {venue.price_tier && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>{getPriceTierIcon(venue.price_tier)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {formatDistance(venue.distance_meters) && (
                <span>{formatDistance(venue.distance_meters)}</span>
              )}
              
              {onSelect && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(venue)
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Drag Hint */}
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center"
            >
              <div className="text-primary text-sm font-medium">
                Drop on timeline to add
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Venue recommendations panel with drag support
interface VenueRecommendationsPanelProps {
  venues: Venue[]
  onVenueSelect: (venue: Venue) => void
  isLoading?: boolean
  className?: string
}

export function VenueRecommendationsPanel({
  venues,
  onVenueSelect,
  isLoading = false,
  className
}: VenueRecommendationsPanelProps) {
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <div className="p-4 border-b border-border/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Venue Recommendations
          </h3>
          <Badge variant="outline" className="text-xs">
            {venues.length} venues
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Drag venues to timeline or click + to add
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))
          ) : venues.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No venue recommendations available
              </p>
            </div>
          ) : (
            venues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <DraggableVenueCard
                  venue={venue}
                  onSelect={onVenueSelect}
                  compact={true}
                  showMatchScore={true}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}