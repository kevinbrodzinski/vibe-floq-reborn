import { MapPin, Navigation, Building, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface LocationData {
  coordinates?: [number, number] // [lng, lat]
  venue_name?: string
  venue_id?: string
  address?: string
  distance_from_previous?: number
}

interface LocationChipProps {
  location: LocationData
  size?: 'sm' | 'md' | 'lg'
  showDistance?: boolean
  interactive?: boolean
  onClick?: () => void
}

export function LocationChip({ 
  location, 
  size = 'md', 
  showDistance = false,
  interactive = false,
  onClick 
}: LocationChipProps) {
  const { venue_name, address, distance_from_previous, coordinates } = location

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }

  const getLocationIcon = () => {
    if (venue_name) {
      // Try to determine venue type from name
      const name = venue_name.toLowerCase()
      if (name.includes('home') || name.includes('house')) return <Home className="w-3 h-3" />
      if (name.includes('office') || name.includes('building')) return <Building className="w-3 h-3" />
    }
    return <MapPin className="w-3 h-3" />
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const displayText = venue_name || address || 'Unknown Location'
  const hasCoordinates = coordinates && coordinates.length === 2

  const chipContent = (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border transition-colors
      ${sizeClasses[size]}
      ${interactive ? 'cursor-pointer hover:bg-accent hover:border-accent-foreground/20' : ''}
      bg-muted/50 border-muted text-muted-foreground
    `}>
      {getLocationIcon()}
      <span className="truncate max-w-[120px]">{displayText}</span>
      
      {showDistance && distance_from_previous && distance_from_previous > 0 && (
        <>
          <div className="w-px h-3 bg-muted-foreground/30" />
          <div className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            <span className="text-xs">{formatDistance(distance_from_previous)}</span>
          </div>
        </>
      )}
    </div>
  )

  if (!interactive) {
    return chipContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
        <button 
          onClick={onClick} 
          className="inline-block"
          aria-label={`View ${displayText} on map`}
          role="button"
        >
          {chipContent}
        </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            {venue_name && <p className="font-medium">{venue_name}</p>}
            {address && <p className="text-muted-foreground">{address}</p>}
            {hasCoordinates && (
              <p className="text-muted-foreground">
                {(+coordinates![1]).toFixed(4)}, {(+coordinates![0]).toFixed(4)}
              </p>
            )}
            {distance_from_previous && distance_from_previous > 0 && (
              <p className="text-muted-foreground">
                {formatDistance(distance_from_previous)} from previous
              </p>
            )}
            <p className="text-xs opacity-75">Click to view on map</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}