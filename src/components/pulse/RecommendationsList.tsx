import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Users, 
  Star, 
  Clock, 
  Calendar,
  TrendingUp,
  Heart,
  Share2,
  Navigation,
  Thermometer,
  CloudRain,
  Sun,
  Zap
} from 'lucide-react';
import { VenueImage } from './VenueImage';

export interface RecommendationItem {
  id: string;
  title: string;
  type: 'venue' | 'event' | 'floq';
  distance?: number; // in meters
  vibe?: string;
  participants?: number;
  maxParticipants?: number;
  startTime?: string;
  endTime?: string;
  status?: 'open' | 'full' | 'starting_soon' | 'ended';
  description?: string;
  location?: string;
  rating?: number;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  host?: {
    name: string;
    avatar?: string;
  };
  tags?: string[];
  friends?: Array<{
    name: string;
    avatar?: string;
  }>;
  vibeMatch?: number; // 0-100
  weatherMatch?: number; // 0-100
  overallScore?: number; // 0-100
  photoUrl?: string;
  isBookmarked?: boolean;
  liveCount?: number;
}

interface RecommendationsListProps {
  recommendations: RecommendationItem[];
  title?: string;
  isLoading?: boolean;
  onItemClick?: (item: RecommendationItem) => void;
  onBookmark?: (itemId: string) => void;
  onShare?: (item: RecommendationItem) => void;
  onDirections?: (item: RecommendationItem) => void;
  maxVisible?: number;
  className?: string;
}

const formatDistance = (distanceMeters?: number) => {
  if (!distanceMeters) return '';
  
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
};

const formatWalkTime = (distanceMeters?: number) => {
  if (!distanceMeters) return '';
  
  // Average walking speed: 5 km/h = 1.39 m/s
  const walkTimeMinutes = Math.round(distanceMeters / 83.33); // 83.33 m/min
  
  if (walkTimeMinutes < 60) {
    return `${walkTimeMinutes}m walk`;
  } else {
    const hours = Math.floor(walkTimeMinutes / 60);
    const minutes = walkTimeMinutes % 60;
    return `${hours}h ${minutes}m walk`;
  }
};

const formatDriveTime = (distanceMeters?: number) => {
  if (!distanceMeters) return '';
  
  // Average city driving speed: 30 km/h = 8.33 m/s
  const driveTimeMinutes = Math.round(distanceMeters / 500); // 500 m/min
  
  if (driveTimeMinutes < 60) {
    return `${driveTimeMinutes}m drive`;
  } else {
    const hours = Math.floor(driveTimeMinutes / 60);
    const minutes = driveTimeMinutes % 60;
    return `${hours}h ${minutes}m drive`;
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'open':
      return 'text-green-400';
    case 'full':
      return 'text-red-400';
    case 'starting_soon':
      return 'text-yellow-400';
    case 'ended':
      return 'text-gray-400';
    default:
      return 'text-white/70';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'venue':
      return <MapPin className="w-4 h-4" />;
    case 'event':
      return <Calendar className="w-4 h-4" />;
    case 'floq':
      return <Users className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
};

const getMatchScore = (item: RecommendationItem) => {
  if (item.overallScore) return item.overallScore;
  
  // Calculate composite score
  let score = 70; // Base score
  
  if (item.vibeMatch) score = (score + item.vibeMatch) / 2;
  if (item.weatherMatch) score = (score + item.weatherMatch) / 2;
  if (item.rating) score = (score + (item.rating * 20)) / 2; // Convert 5-star to 100-point
  if (item.friends && item.friends.length > 0) score += 10; // Boost for friends
  
  return Math.min(100, Math.round(score));
};

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  title = "Recommended for you",
  isLoading = false,
  onItemClick,
  onBookmark,
  onShare,
  onDirections,
  maxVisible,
  className = ''
}) => {
  const visibleRecommendations = maxVisible 
    ? recommendations.slice(0, maxVisible) 
    : recommendations;

  // Sort by overall score
  const sortedRecommendations = [...visibleRecommendations].sort((a, b) => {
    return getMatchScore(b) - getMatchScore(a);
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-lg">{title}</h2>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-white/20 rounded"></div>
                  <div className="w-24 h-3 bg-white/20 rounded"></div>
                  <div className="w-40 h-3 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedRecommendations.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-lg">{title}</h2>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
          <TrendingUp className="w-8 h-8 text-white/40 mx-auto mb-3" />
          <p className="text-white/70 text-sm">No recommendations available</p>
          <p className="text-white/50 text-xs mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-white" />
        <h2 className="font-bold text-white text-lg">{title}</h2>
        <span className="text-sm text-white/60">({sortedRecommendations.length})</span>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {sortedRecommendations.map((item, index) => {
          const matchScore = getMatchScore(item);
          const walkTime = formatWalkTime(item.distance);
          const driveTime = formatDriveTime(item.distance);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
              onClick={() => onItemClick?.(item)}
            >
              <div className="flex gap-4">
                {/* Image/Icon */}
                <div className="relative flex-shrink-0">
                  <VenueImage
                    src={item.photoUrl}
                    alt={item.title}
                    type={item.type}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  
                  {/* Match score badge */}
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {matchScore}
                  </div>
                  
                  {/* Live indicator for venues */}
                  {item.type === 'venue' && item.liveCount && item.liveCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      {item.liveCount}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-base truncate">
                        {item.title}
                      </h3>
                      
                      {/* Type and status */}
                      <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                        <span className="capitalize flex items-center gap-1">
                          {getTypeIcon(item.type)}
                          {item.type}
                        </span>
                        {item.status && (
                          <>
                            <span>•</span>
                            <span className={getStatusColor(item.status)}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookmark?.(item.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.isBookmarked 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        <Heart className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare?.(item);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDirections?.(item);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Distance and timing */}
                  {item.distance && (
                    <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(item.distance)}
                      </span>
                      {walkTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {walkTime}
                        </span>
                      )}
                      {driveTime && item.distance && item.distance > 800 && (
                        <span>/ {driveTime}</span>
                      )}
                    </div>
                  )}

                  {/* Type-specific info */}
                  <div className="space-y-1 mb-3">
                    {/* Venue info */}
                    {item.type === 'venue' && (
                      <div className="flex items-center gap-3 text-xs text-white/70">
                        {item.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            {item.rating.toFixed(1)}
                          </span>
                        )}
                        {item.priceRange && (
                          <span className="text-green-400">{item.priceRange}</span>
                        )}
                        {item.vibe && (
                          <span className="capitalize">{item.vibe} vibe</span>
                        )}
                      </div>
                    )}

                    {/* Event info */}
                    {item.type === 'event' && (
                      <div className="flex items-center gap-3 text-xs text-white/70">
                        {item.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.startTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                        {item.participants && item.maxParticipants && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.participants}/{item.maxParticipants}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Floq info */}
                    {item.type === 'floq' && (
                      <div className="flex items-center gap-3 text-xs text-white/70">
                        {item.participants && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.participants} members
                          </span>
                        )}
                        {item.host && (
                          <span>hosted by {item.host.name}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Friends going */}
                  {item.friends && item.friends.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex -space-x-2">
                        {item.friends.slice(0, 3).map((friend, i) => (
                          <div key={i} className="relative">
                            {friend.avatar ? (
                              <img
                                src={friend.avatar}
                                alt={friend.name}
                                className="w-6 h-6 rounded-full border-2 border-gray-900 object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-gray-900 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                {friend.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-white/70">
                        {item.friends.length === 1 
                          ? `${item.friends[0].name} is going`
                          : item.friends.length <= 3
                            ? `${item.friends.length} friends going`
                            : `${item.friends.length} friends going`
                        }
                      </span>
                    </div>
                  )}

                  {/* Match indicators */}
                  <div className="flex items-center gap-3 text-xs">
                    {item.vibeMatch && (
                      <div className="flex items-center gap-1 text-purple-400">
                        <Zap className="w-3 h-3" />
                        <span>{item.vibeMatch}% vibe match</span>
                      </div>
                    )}
                    {item.weatherMatch && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <Sun className="w-3 h-3" />
                        <span>{item.weatherMatch}% weather match</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};