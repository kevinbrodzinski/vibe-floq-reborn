import { MapPin, Navigation, Building, Home, Users, TrendingUp, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface VenueIntelligenceData {
  vibe_match?: {
    score: number;
    explanation: string;
  };
  social_proof?: {
    friend_visits: number;
    popular_with: string;
  };
  crowd_intelligence?: {
    current_capacity: number;
    typical_crowd: string;
  };
}

interface LocationData {
  coordinates?: [number, number] // [lng, lat]
  venue_name?: string
  venue_id?: string
  address?: string
  distance_from_previous?: number
  venue_intelligence?: VenueIntelligenceData
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
  const { venue_name, address, distance_from_previous, coordinates, venue_intelligence } = location

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
  const hasIntelligence = venue_intelligence && (
    venue_intelligence.vibe_match || 
    venue_intelligence.social_proof || 
    venue_intelligence.crowd_intelligence
  )

  const getIntelligenceIndicators = () => {
    if (!hasIntelligence) return null;

    const indicators = [];

    // Vibe match indicator
    if (venue_intelligence?.vibe_match && venue_intelligence.vibe_match.score > 0.7) {
      indicators.push(
        <Heart key="vibe" className="w-3 h-3 text-pink-500" title="Great vibe match!" />
      );
    }

    // Social proof indicator
    if (venue_intelligence?.social_proof && venue_intelligence.social_proof.friend_visits > 0) {
      indicators.push(
        <Users key="social" className="w-3 h-3 text-blue-500" title="Friends have been here" />
      );
    }

    // Crowd intelligence indicator
    if (venue_intelligence?.crowd_intelligence && venue_intelligence.crowd_intelligence.current_capacity > 50) {
      indicators.push(
        <TrendingUp key="crowd" className="w-3 h-3 text-green-500" title="Popular spot" />
      );
    }

    return indicators.length > 0 ? (
      <>
        <div className="w-px h-3 bg-muted-foreground/30" />
        <div className="flex items-center gap-1">
          {indicators}
        </div>
      </>
    ) : null;
  }

  const chipContent = (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border transition-colors
      ${sizeClasses[size]}
      ${interactive ? 'cursor-pointer hover:bg-accent hover:border-accent-foreground/20' : ''}
      ${hasIntelligence ? 'bg-gradient-to-r from-muted/50 to-accent/20 border-accent/30' : 'bg-muted/50 border-muted'}
      text-muted-foreground
    `}>
      {getLocationIcon()}
      <span className="truncate max-w-[120px]">{displayText}</span>
      
      {getIntelligenceIndicators()}
      
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
          <div className="space-y-2 text-xs max-w-xs">
            {venue_name && <p className="font-medium">{venue_name}</p>}
            {address && <p className="text-muted-foreground">{address}</p>}
            
            {/* Venue Intelligence Section */}
            {hasIntelligence && (
              <div className="border-t pt-2 space-y-1">
                <p className="font-medium text-accent-foreground">Venue Intelligence</p>
                
                {venue_intelligence?.vibe_match && (
                  <div className="flex items-center gap-2">
                    <Heart className="w-3 h-3 text-pink-500" />
                    <span className="text-muted-foreground">
                      {venue_intelligence.vibe_match.explanation}
                    </span>
                  </div>
                )}
                
                {venue_intelligence?.social_proof && venue_intelligence.social_proof.friend_visits > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span className="text-muted-foreground">
                      {venue_intelligence.social_proof.friend_visits} friend{venue_intelligence.social_proof.friend_visits !== 1 ? 's' : ''} visited
                    </span>
                  </div>
                )}
                
                {venue_intelligence?.crowd_intelligence && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-muted-foreground">
                      {venue_intelligence.crowd_intelligence.typical_crowd}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Location Details */}
            <div className="border-t pt-2 space-y-1">
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
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}