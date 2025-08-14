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
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 via-white/5 to-white/3 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:from-white/12 hover:via-white/8 hover:to-white/5 transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-2xl hover:shadow-white/10"
      onClick={handleClick}
    >
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-4 flex gap-4">
        {/* Enhanced Image/Icon */}
        <div className="flex-shrink-0 relative">
          {item.imageUrl ? (
            <div className="relative">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/15 group-hover:border-white/25 transition-all duration-300 shadow-lg"
              />
              {/* Image overlay gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br border-2 border-white/15 group-hover:border-white/25 transition-all duration-300 shadow-lg relative overflow-hidden',
              item.type === 'venue' ? 'from-emerald-500/25 via-green-500/20 to-teal-500/15' :
              item.type === 'event' ? 'from-blue-500/25 via-indigo-500/20 to-purple-500/15' :
              'from-purple-500/25 via-pink-500/20 to-rose-500/15'
            )}>
              {/* Icon background glow */}
              <div className={cn(
                'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                item.type === 'venue' ? 'bg-gradient-to-br from-emerald-400/10 to-green-400/5' :
                item.type === 'event' ? 'bg-gradient-to-br from-blue-400/10 to-indigo-400/5' :
                'bg-gradient-to-br from-purple-400/10 to-pink-400/5'
              )} />
              <div className={cn(
                'relative z-10 transition-transform duration-300 group-hover:scale-110',
                getTypeColor(item.type)
              )}>
                {getTypeIcon(item.type)}
              </div>
            </div>
          )}
          
          {/* Type indicator dot */}
          <div className={cn(
            'absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white/20 shadow-lg',
            item.type === 'venue' ? 'bg-emerald-400' :
            item.type === 'event' ? 'bg-blue-400' :
            'bg-purple-400'
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-lg text-white truncate group-hover:text-white/95 transition-colors leading-tight">
              {item.title}
            </h3>
            {showScores && item.vibeMatch && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-300 bg-gradient-to-r from-yellow-500/15 to-amber-500/10 px-3 py-1.5 rounded-full border border-yellow-400/25 group-hover:border-yellow-400/40 transition-all duration-300 shadow-sm backdrop-blur-sm shrink-0">
                <Zap className="w-3.5 h-3.5" />
                <span>{formatMatchScore(item.vibeMatch)}</span>
              </div>
            )}
          </div>

          {/* Meta Information - Organized in two lines */}
          <div className="space-y-1">
            {/* First line: Category, Distance, Status */}
            <div className="flex items-center gap-2 text-sm text-white/75 font-medium">
              {item.category && (
                <span className="text-white/85">{item.category}</span>
              )}
              {item.distance && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="text-blue-300">{formatDistance(item.distance)}</span>
                </>
              )}
              {item.type === 'venue' && item.isOpen !== undefined && (
                <>
                  <span className="text-white/40">•</span>
                  <span className={cn(
                    'font-semibold',
                    item.isOpen ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {item.isOpen ? 'Open' : 'Closed'}
                  </span>
                </>
              )}
              {item.rating && (
                <>
                  <span className="text-white/40">•</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    <span className="text-yellow-300 font-semibold">{item.rating.toFixed(1)}</span>
                  </div>
                </>
              )}
              {item.priceLevel && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="text-emerald-400 font-bold">{item.priceLevel}</span>
                </>
              )}
            </div>

            {/* Second line: Travel times and type-specific info */}
            <div className="flex items-center gap-2 text-xs text-white/60">
              {item.walkTime && (
                <span className="bg-white/10 px-2 py-1 rounded-md border border-white/15">
                  🚶 {item.walkTime} min
                </span>
              )}
              {item.driveTime && item.driveTime > 0 && (
                <span className="bg-white/10 px-2 py-1 rounded-md border border-white/15">
                  🚗 {item.driveTime} min
                </span>
              )}
              {item.type === 'floq' && item.participants && (
                <span className="bg-purple-500/15 text-purple-300 px-2 py-1 rounded-md border border-purple-500/25">
                  {item.participants} going
                </span>
              )}
              {item.type === 'event' && item.startTime && (
                <span className="bg-blue-500/15 text-blue-300 px-2 py-1 rounded-md border border-blue-500/25">
                  {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-white/70 leading-relaxed line-clamp-2 group-hover:text-white/80 transition-colors">
              {item.description}
            </p>
          )}

          {/* Social Proof Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {/* Regulars badge */}
              {item.regularsCount && item.regularsCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-300 bg-gradient-to-r from-orange-500/15 to-amber-500/10 px-2.5 py-1.5 rounded-full border border-orange-400/25 shadow-sm">
                  <Users className="w-3.5 h-3.5" />
                  <span>{item.regularsCount} regular{item.regularsCount === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            
            {/* Friends going */}
            {item.friendsGoing && item.friendsGoing.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {item.friendsGoing.slice(0, 3).map((friend, index) => (
                    <div key={index} className="w-7 h-7 rounded-full border-2 border-white/25 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs text-white font-bold shadow-lg transition-transform duration-300 hover:scale-110 hover:z-10 relative">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                </div>
                {item.friendsGoing.length > 3 && (
                  <span className="text-xs text-white/60 font-medium ml-1">
                    +{item.friendsGoing.length - 3}
                  </span>
                )}
              </div>
            )}
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