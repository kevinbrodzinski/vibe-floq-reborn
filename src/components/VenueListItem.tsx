import { motion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VenueListItemProps {
  venue: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    vibe: string;
    source: string;
    distance_m?: number;
    live_count?: number;
  };
  onTap: (venueId: string) => void;
}

const getVibeEmoji = (vibe: string) => {
  const vibeMap: Record<string, string> = {
    'cafe': '☕',
    'nightlife': '🌙',
    'park': '🌳',
    'transit': '🚇',
    'creative': '🎨',
    'wellness': '🧘',
    'restaurant': '🍽️',
    'bar': '🍻',
    'shopping': '🛍️',
    'cultural': '🏛️',
    'fitness': '💪',
    'entertainment': '🎬'
  };
  return vibeMap[vibe] || '📍';
};

const formatDistance = (meters?: number) => {
  if (!meters) return '— km';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export function VenueListItem({ venue, onTap }: VenueListItemProps) {
  const hasLiveCount = (venue.live_count ?? 0) > 0;

  return (
    <motion.div
      layout
      layoutId={venue.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(venue.id)}
      className="flex items-center gap-3 p-3 hover:bg-muted/50 active:bg-muted cursor-pointer border-b border-border/40 last:border-0"
    >
      {/* Vibe Emoji with Ring Animation */}
      <div className="relative flex-shrink-0">
        <div 
          className={`
            w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg
            ${hasLiveCount ? 'animate-pulse' : ''}
          `}
        >
          {getVibeEmoji(venue.vibe)}
        </div>
        
        {/* Ring animation for active venues */}
        {hasLiveCount && (
          <motion.div
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 border-2 border-primary rounded-full"
          />
        )}
      </div>

      {/* Venue Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-foreground truncate">
            {venue.name}
          </h3>
          {venue.vibe && (
            <Badge variant="secondary" className="text-xs">
              {venue.vibe}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{formatDistance(venue.distance_m)}</span>
          </div>
          
          {hasLiveCount && (
            <div className="flex items-center gap-1 text-primary">
              <Users className="h-3 w-3" />
              <span className="font-medium">{venue.live_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chevron indicator */}
      <div className="flex-shrink-0 text-muted-foreground">
        <motion.div
          className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
          whileTap={{ scale: 0.9 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path 
              d="M4.5 3L7.5 6L4.5 9" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}