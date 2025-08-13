import React, { useMemo } from 'react';
import { TrendingUp, MapPin, Clock, Users, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeScoreToPercent, formatDistance as formatDistanceUtil, estimateWalkMinutes, estimateDriveMinutes } from '@/utils/venueMetrics';

export type RecommendationType = 'venue' | 'event' | 'floq';

export interface RecommendationItem {
  id: string;
  title: string;
  type: RecommendationType;
  distance?: number; // meters
  walkTime?: number; // minutes
  driveTime?: number; // minutes
  category?: string;
  description?: string;
  location?: string;
  
  // Venue-specific
  rating?: number;
  priceLevel?: '$' | '$$' | '$$$' | '$$$$';
  isOpen?: boolean;
  
  // Event-specific
  startTime?: string;
  endTime?: string;
  ticketPrice?: string;
  
  // Floq-specific
  participants?: number;
  maxParticipants?: number;
  hostName?: string;
  hostAvatar?: string;
  
  // Scoring
  vibeMatch?: number; // 0-100
  weatherMatch?: number; // 0-100
  overallScore?: number; // 0-100
  
  // Social context
  friendsGoing?: Array<{
    name: string;
    avatar?: string;
  }>;
  
  // Media
  imageUrl?: string;
  tags?: string[];
  
  // Social proof
  regularsCount?: number; // Number of regulars/frequent visitors
}

interface RecommendationsListProps {
  items: RecommendationItem[];
  title?: string; // Allow custom title for future renaming
  maxItems?: number;
  showScores?: boolean;
  onItemClick?: (item: RecommendationItem) => void;
  onViewMore?: () => void;
  loading?: boolean;
  className?: string;
}

const formatDistance = (meters?: number): string => {
  return formatDistanceUtil(meters);
};

const formatMatchScore = (score?: number): string => {
  if (!score) return '';
  const normalizedScore = normalizeScoreToPercent(score);
  return `${normalizedScore}% match`;
};

const getTypeIcon = (type: RecommendationType) => {
  switch (type) {
    case 'venue':
      return <MapPin className="w-4 h-4" />;
    case 'event':
      return <Clock className="w-4 h-4" />;
    case 'floq':
      return <Users className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
};

const getTypeColor = (type: RecommendationType): string => {
  switch (type) {
    case 'venue':
      return 'text-green-400';
    case 'event':
      return 'text-blue-400';
    case 'floq':
      return 'text-purple-400';
    default:
      return 'text-white/60';
  }
};

const RecommendationCard: React.FC<{
  item: RecommendationItem;
  showScores: boolean;
  onClick?: (item: RecommendationItem) => void;
}> = ({ item, showScores, onClick }) => {
  const handleClick = () => {
    onClick?.(item);
  };

  return (
    <div
      className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Image or Icon */}
        <div className="flex-shrink-0">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-14 h-14 rounded-xl object-cover border border-white/20 group-hover:border-white/30 transition-colors"
            />
          ) : (
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br border border-white/10 group-hover:border-white/20 transition-colors',
              item.type === 'venue' ? 'from-green-500/20 to-emerald-500/20' :
              item.type === 'event' ? 'from-blue-500/20 to-cyan-500/20' :
              'from-purple-500/20 to-pink-500/20'
            )}>
              <div className={getTypeColor(item.type)}>
                {getTypeIcon(item.type)}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-white truncate group-hover:text-white/90 transition-colors text-base">{item.title}</h3>
            {showScores && item.vibeMatch && (
              <div className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/20 group-hover:bg-yellow-400/15 transition-colors">
                <Zap className="w-3 h-3" />
                {formatMatchScore(item.vibeMatch)}
              </div>
            )}
          </div>

          {/* Category, Distance, and Time */}
          <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
            {item.category && (
              <span>{item.category}</span>
            )}
            {item.distance && (
              <>
                <span>•</span>
                <span>{formatDistance(item.distance)}</span>
              </>
            )}
            {item.walkTime && (
              <>
                <span>•</span>
                <span>{item.walkTime} min walk</span>
              </>
            )}
            {item.driveTime && item.driveTime > 0 && (
              <>
                <span>•</span>
                <span>{item.driveTime} min drive</span>
              </>
            )}
            {item.rating && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span>{item.rating.toFixed(1)}</span>
                </div>
              </>
            )}
            {item.priceLevel && (
              <>
                <span>•</span>
                <span className="text-green-400 font-medium">{item.priceLevel}</span>
              </>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-white/70 mb-2 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Type-specific info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-white/50">
              {item.type === 'floq' && item.participants && (
                <span>{item.participants} going</span>
              )}
              {item.type === 'event' && item.startTime && (
                <span>{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {item.type === 'venue' && item.isOpen !== undefined && (
                <span className={item.isOpen ? 'text-green-400' : 'text-red-400'}>
                  {item.isOpen ? 'Open' : 'Closed'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Regulars badge */}
              {item.regularsCount && item.regularsCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full border border-orange-400/20">
                  <Users className="w-3 h-3" />
                  <span>{item.regularsCount} regulars</span>
                </div>
              )}
              
              {/* Friends going */}
              {item.friendsGoing && item.friendsGoing.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {item.friendsGoing.slice(0, 3).map((friend, index) => (
                      <div key={index} className="w-6 h-6 rounded-full border border-white/20 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs text-white font-medium">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          friend.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    ))}
                  </div>
                  {item.friendsGoing.length > 3 && (
                    <span className="text-xs text-white/50 ml-1">
                      +{item.friendsGoing.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  items,
  title = "Recommended for you", // Default title, easily changed for future renaming
  maxItems,
  showScores = true,
  onItemClick,
  onViewMore,
  loading = false,
  className
}) => {
  const displayItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [items, maxItems]);

  const hasMore = maxItems && items.length > maxItems;

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-white animate-pulse" />
          <h2 className="font-bold text-white text-lg">{title}</h2>
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <TrendingUp className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/50 text-sm">No recommendations available</p>
        <p className="text-white/30 text-xs mt-1">Try adjusting your filters or check back later</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-white" />
        <h2 className="font-bold text-white text-lg">{title}</h2>
        {items.length > 0 && (
          <span className="text-sm text-white/50">({items.length})</span>
        )}
      </div>

      <div className="space-y-3">
        {displayItems.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            showScores={showScores}
            onClick={onItemClick}
          />
        ))}
      </div>

      {/* View More Button */}
      {hasMore && onViewMore && (
        <button
          onClick={onViewMore}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-white/70 hover:text-white text-sm font-medium"
        >
          View {items.length - maxItems!} more recommendations
          <TrendingUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};