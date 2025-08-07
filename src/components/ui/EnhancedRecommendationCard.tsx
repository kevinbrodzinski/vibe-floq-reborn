import React, { useState } from 'react';
import { 
  MapPin, 
  Users, 
  Clock, 
  Star, 
  Heart, 
  Eye, 
  UserPlus, 
  Calendar,
  Building2,
  Sparkles,
  CheckCircle,
  Lock,
  Unlock,
  AlertCircle,
  Bookmark,
  Share2,
  ThumbsUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchlist } from '@/hooks/useWatchlist';
import { calculateVibeMatch, getUserVibeDistribution, getEventVibeDistribution } from '@/utils/vibeMatch';
import { VibeMatchBadge } from './VibeMatchBadge';
import { useVibe } from '@/lib/store/useVibe';
import { BumpButton } from '@/components/venue/BumpButton';
import { FriendVisitBadge } from '@/components/venue/FriendVisitBadge';
import { TooltipProvider } from '@/components/ui/tooltip';

interface RecommendationItem {
  id: string;
  title: string;
  type: 'venue' | 'floq' | 'plan';
  distance: number;
  vibe?: string;
  participants?: number;
  maxParticipants?: number;
  startTime?: string;
  endTime?: string;
  status: 'open' | 'invite_only' | 'upcoming' | 'active' | 'full' | 'private';
  price?: string;
  rating?: number;
  description?: string;
  location?: string;
  host?: {
    name: string;
    avatar?: string;
  };
  tags?: string[];
  isFavorite?: boolean;
  isWatching?: boolean;
  isRSVPd?: boolean;
  spotsLeft?: number;
  venueType?: string;
  atmosphere?: string;
  friends?: { name: string; avatar?: string }[];
  vibeMatch?: number;
}

interface EnhancedRecommendationCardProps {
  item: RecommendationItem;
  onAction: (action: string, itemId: string) => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'invite_only': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'upcoming': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'active': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'full': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'private': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open': return <Unlock className="w-3 h-3" />;
    case 'invite_only': return <Lock className="w-3 h-3" />;
    case 'upcoming': return <Calendar className="w-3 h-3" />;
    case 'active': return <CheckCircle className="w-3 h-3" />;
    case 'full': return <AlertCircle className="w-3 h-3" />;
    case 'private': return <Lock className="w-3 h-3" />;
    default: return <Eye className="w-3 h-3" />;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'venue': return <Building2 className="w-4 h-4" />;
    case 'floq': return <Users className="w-4 h-4" />;
    case 'plan': return <Calendar className="w-4 h-4" />;
    default: return <Sparkles className="w-4 h-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'venue': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'floq': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'plan': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const EnhancedRecommendationCard: React.FC<EnhancedRecommendationCardProps> = ({
  item,
  onAction,
  className
}) => {
  const { isFavorite, addFavorite, removeFavorite, isAdding, isRemoving } = useFavorites();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist, isAdding: isAddingToWatchlist, isRemoving: isRemovingFromWatchlist } = useWatchlist();
  const { vibe: currentVibe } = useVibe();

  // Calculate vibe match if vibe data is available
  const vibeMatch = React.useMemo(() => {
    if (!item.vibe || !currentVibe) return null;
    
    const userVibeCounts = getUserVibeDistribution(currentVibe, []);
    const eventVibeCounts = getEventVibeDistribution(
      [], // No crowd data yet
      item.tags || [],
      item.vibe
    );
    
    return calculateVibeMatch(userVibeCounts, eventVibeCounts, {});
  }, [item.vibe, item.tags, currentVibe]);

  const handleAction = (action: string) => {
    onAction(action, item.id);
    
    // Handle favorites and watchlist actions
    if (action === 'favorite') {
      if (isFavorite(item.id)) {
        removeFavorite(item.id);
      } else {
        addFavorite({
          itemId: item.id,
          itemType: item.type === 'venue' ? 'venue' : 'plan',
          title: item.title,
          description: item.description,
          imageUrl: item.host?.avatar,
        });
      }
    } else if (action === 'watch' && item.type === 'plan') {
      if (isInWatchlist(item.id)) {
        removeFromWatchlist(item.id);
      } else {
        addToWatchlist(item.id);
      }
    }
  };

  const getPrimaryAction = () => {
    switch (item.type) {
      case 'venue':
        return 'Visit';
      case 'floq':
        if (item.status === 'open') return 'Join';
        if (item.status === 'invite_only') return 'Request';
        if (item.status === 'upcoming') return 'RSVP';
        return 'View';
      case 'plan':
        return 'Join';
      default:
        return 'View';
    }
  };

  const getSecondaryActions = () => {
    const actions = [];
    
    if (item.type === 'venue') {
      actions.push('Bump', 'Favorite', 'Share');
    } else {
      if (item.status === 'upcoming') actions.push('Watch');
      actions.push('Favorite', 'Share');
    }
    
    return actions;
  };

  return (
    <div className={cn(
      "bg-card/40 backdrop-blur-xl rounded-3xl border border-border/30 p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-card/60",
      className
    )}>
      {/* Header with Type Badge and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs font-medium", getTypeColor(item.type))}
          >
            {getTypeIcon(item.type)}
            <span className="ml-1 capitalize">{item.type}</span>
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs font-medium", getStatusColor(item.status))}
          >
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
          </Badge>
        </div>
      </div>

      {/* Title and Host */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
          {item.title}
        </h3>
        
        {item.host && (
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={item.host.avatar} />
              <AvatarFallback className="text-xs">
                {item.host.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              by {item.host.name}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Key Details */}
      <div className="space-y-3 mb-4">
        {/* Location and Distance */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{item.location || 'Location not specified'}</span>
          <span>•</span>
          <span>{formatDistance(item.distance)}</span>
          {item.type === 'venue' && (
            <>
              <span>•</span>
              <TooltipProvider>
                <FriendVisitBadge venueId={item.id} />
              </TooltipProvider>
            </>
          )}
        </div>

        {/* Participants (for floqs/plans) */}
        {item.participants !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{item.participants}</span>
            {item.maxParticipants && (
              <>
                <span>/</span>
                <span>{item.maxParticipants}</span>
              </>
            )}
            {item.spotsLeft && item.spotsLeft > 0 && (
              <>
                <span>•</span>
                <span className="text-orange-400">{item.spotsLeft} spots left</span>
              </>
            )}
          </div>
        )}

        {/* Friends Going */}
        {item.friends && item.friends.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              className="underline hover:text-primary focus:outline-none"
              onClick={() => onAction('friends', item.id)}
              type="button"
            >
              {item.friends.length} friend{item.friends.length > 1 ? 's' : ''} going
            </button>
          </div>
        )}

        {/* Vibe Match Badge */}
        {vibeMatch && (
          <div className="flex items-center gap-2 text-sm">
            <VibeMatchBadge 
              matchPercentage={vibeMatch.matchPercentage}
              blendedColor={vibeMatch.blendedColor}
              size="sm"
              showIcon={false}
            />
          </div>
        )}

        {/* Time (for events) */}
        {item.startTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTime(item.startTime)}</span>
            {item.endTime && (
              <>
                <span>-</span>
                <span>{formatTime(item.endTime)}</span>
              </>
            )}
          </div>
        )}

        {/* Venue-specific details */}
        {item.type === 'venue' && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {item.price && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{item.price}</span>
              </div>
            )}
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{item.rating.toFixed(1)}</span>
              </div>
            )}
            {item.venueType && (
              <span className="capitalize">{item.venueType}</span>
            )}
          </div>
        )}

        {/* Vibe Match */}
        {typeof item.vibeMatch === 'number' && (
          <div className="flex items-center gap-2 text-xs text-primary font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Vibe Match: {item.vibeMatch}%</span>
          </div>
        )}

        {/* Vibe and Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.vibe && (
            <Badge variant="secondary" className="text-xs">
              {item.vibe}
            </Badge>
          )}
          {item.tags?.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Primary Action */}
        <Button 
          className="flex-1"
          variant={item.status === 'full' ? 'secondary' : 'default'}
          disabled={item.status === 'full'}
          onClick={() => handleAction(getPrimaryAction().toLowerCase())}
        >
          {getPrimaryAction()}
        </Button>

        {/* Secondary Actions */}
        <div className="flex gap-1">
          {getSecondaryActions().map((action) => (
            action === 'Bump' && item.type === 'venue' ? (
              <TooltipProvider key={action}>
                <BumpButton 
                  venueId={item.id}
                  className="w-8 h-8 p-0"
                  size="sm"
                  variant="ghost"
                />
              </TooltipProvider>
            ) : (
              <Button
                key={action}
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => handleAction(action.toLowerCase())}
              >
                {action === 'Favorite' && (
                  <Heart className={cn("w-4 h-4", isFavorite(item.id) && "fill-red-500 text-red-500")} />
                )}
                {action === 'Watch' && (
                  <Eye className={cn("w-4 h-4", isInWatchlist(item.id) && "text-blue-500")} />
                )}
                {action === 'Share' && (
                  <Share2 className="w-4 h-4" />
                )}
              </Button>
            )
          ))}
        </div>
      </div>
    </div>
  );
}; 