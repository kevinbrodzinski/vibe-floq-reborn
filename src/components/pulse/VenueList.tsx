import React from 'react';
import { MapPin, Star, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { VenueImage } from './VenueImage';
import { getVenueStatus } from '@/lib/utils/contextualFiltering';
import type { VenueCarouselItem } from './VenueCarousel';

interface VenueListProps {
  items: VenueCarouselItem[];
  loading?: boolean;
  onOpen?: (id: string) => void;
  className?: string;
}

// Format distance utility
const formatDistance = (distance?: number | string | null): string | null => {
  if (distance == null) return null;
  const meters = typeof distance === 'string' ? parseFloat(distance) : distance;
  if (!Number.isFinite(meters) || meters <= 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export const VenueList: React.FC<VenueListProps> = ({
  items,
  loading = false,
  onOpen,
  className = ''
}) => {
  // Show skeleton items while loading
  const displayItems = loading
    ? Array.from({ length: 6 }).map((_, i) => ({ 
        id: `skeleton-${i}`, 
        name: '', 
        photoUrl: null 
      }))
    : items;

  if (displayItems.length === 0) {
    return (
      <div className={`text-center py-8 text-white/60 ${className}`}>
        No venues found
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayItems.map((venue, index) => (
        <motion.div
          key={venue.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <motion.button
            type="button"
            onClick={() => venue.name && onOpen?.(venue.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-200 text-left group"
            disabled={!venue.name || loading}
          >
            <div className="flex items-center gap-4">
              {/* Venue image */}
              <div className="flex-shrink-0">
                <VenueImage
                  src={venue.photoUrl}
                  alt={venue.name || 'Venue'}
                  type="venue"
                  className="w-16 h-16 rounded-xl object-cover"
                />
              </div>

              {/* Venue details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  {/* Left side - main info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-semibold text-base truncate group-hover:text-white/90 transition-colors">
                      {venue.name || (loading ? 'Loading...' : 'Unknown Venue')}
                    </h3>
                    
                    {venue.subtitle && (
                      <p className="text-white/70 text-sm truncate mt-0.5">
                        {venue.subtitle}
                      </p>
                    )}

                    {/* Distance, rating, and live count */}
                    <div className="flex items-center gap-3 text-white/60 text-sm mt-2">
                      {formatDistance(venue.distance) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {formatDistance(venue.distance)}
                        </span>
                      )}
                      
                      {venue.rating && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current text-amber-400" />
                          {venue.rating.toFixed(1)}
                        </span>
                      )}
                      
                      {venue.liveCount && venue.liveCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <Users className="w-4 h-4" />
                          {venue.liveCount} here now
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {venue.tags && venue.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {venue.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/80 border border-white/20"
                          >
                            {tag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side - badges and scores */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* Match scores */}
                    <div className="flex flex-col gap-1">
                      {venue.vibeMatch && (
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-amber-400/20 text-amber-300 border border-amber-300/30">
                          ⚡ {Math.round(venue.vibeMatch)}%
                        </div>
                      )}
                      
                      {venue.weatherMatch && venue.weatherMatch > 80 && (
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-300 border border-green-300/30">
                          🌤️ {Math.round(venue.weatherMatch)}%
                        </div>
                      )}
                    </div>

                    {/* Venue status indicator */}
                    {venue.name && (
                      <VenueStatusIndicator venueName={venue.name} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
};

// Small component to show venue status (open/closed)
const VenueStatusIndicator: React.FC<{ venueName: string }> = ({ venueName }) => {
  // Mock venue status - in real app, this would use actual venue data
  const mockStatus = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 22) {
      return { isOpen: true, status: 'open' as const };
    } else if (hour >= 23 || hour <= 2) {
      return { isOpen: false, status: 'closing_soon' as const };
    }
    return { isOpen: false, status: 'closed' as const };
  }, []);

  const getStatusColor = () => {
    switch (mockStatus.status) {
      case 'open':
        return 'text-green-400';
      case 'closed':
        return 'text-red-400';
      case 'closing_soon':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (mockStatus.status) {
      case 'open':
        return 'Open';
      case 'closed':
        return 'Closed';
      case 'closing_soon':
        return 'Closing soon';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 text-xs ${getStatusColor()}`}>
      <Clock className="w-3 h-3" />
      <span>{getStatusText()}</span>
    </div>
  );
};