import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Activity, 
  ArrowRight,
  CheckCircle,
  UserPlus,
  Play
} from 'lucide-react';

interface LiveActivityItem {
  id: string;
  created_at: string;
  event_type: 'check_in' | 'floq_join' | 'plan_start' | 'venue_visit';
  profile_id: string;
  floq_id?: string;
  venue_id?: string;
  vibe_tag?: string;
  people_count?: number;
  meta?: {
    actor_name?: string;
    actor_avatar?: string;
    venue_name?: string;
    floq_title?: string;
    plan_title?: string;
  };
}

interface LiveActivityProps {
  activities?: LiveActivityItem[];
  maxVisible?: number;
  onViewMore?: () => void;
  onActivityClick?: (activity: LiveActivityItem) => void;
  className?: string;
  isLoading?: boolean;
}

const getActivityIcon = (eventType: string) => {
  switch (eventType) {
    case 'check_in':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'floq_join':
      return <UserPlus className="w-4 h-4 text-blue-400" />;
    case 'plan_start':
      return <Play className="w-4 h-4 text-purple-400" />;
    case 'venue_visit':
      return <MapPin className="w-4 h-4 text-orange-400" />;
    default:
      return <Activity className="w-4 h-4 text-gray-400" />;
  }
};

const getActivityText = (activity: LiveActivityItem) => {
  const actorName = activity.meta?.actor_name || 'Someone';
  
  switch (activity.event_type) {
    case 'check_in':
      return {
        primary: `${actorName} checked in`,
        secondary: activity.meta?.venue_name ? `at ${activity.meta.venue_name}` : 'at a venue',
        action: 'View location'
      };
    case 'floq_join':
      return {
        primary: `${actorName} joined a floq`,
        secondary: activity.meta?.floq_title || 'New floq activity',
        action: 'Join floq'
      };
    case 'plan_start':
      return {
        primary: `${actorName} started a plan`,
        secondary: activity.meta?.plan_title || 'New plan activity',
        action: 'View plan'
      };
    case 'venue_visit':
      return {
        primary: `${actorName} is at`,
        secondary: activity.meta?.venue_name || 'a venue',
        action: 'Visit venue'
      };
    default:
      return {
        primary: `${actorName} had activity`,
        secondary: 'Recent activity',
        action: 'View'
      };
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffMs = now.getTime() - activityTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const getAvatarFallback = (name?: string) => {
  return name ? name.charAt(0).toUpperCase() : '?';
};

export const LiveActivity: React.FC<LiveActivityProps> = ({
  activities = [],
  maxVisible = 3,
  onViewMore,
  onActivityClick,
  className = '',
  isLoading = false
}) => {
  const visibleActivities = activities.slice(0, maxVisible);
  const hasMoreActivities = activities.length > maxVisible;

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-lg">Live Activity</h2>
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-white/20 rounded"></div>
                  <div className="w-24 h-3 bg-white/20 rounded"></div>
                </div>
                <div className="w-16 h-3 bg-white/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-lg">Live Activity</h2>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center">
          <Activity className="w-8 h-8 text-white/40 mx-auto mb-3" />
          <p className="text-white/70 text-sm">No recent activity from friends</p>
          <p className="text-white/50 text-xs mt-1">Check back later for updates</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-white" />
          <h2 className="font-bold text-white text-lg">Live Activity</h2>
        </div>
        
        {hasMoreActivities && onViewMore && (
          <button
            onClick={onViewMore}
            className="text-xs font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1"
          >
            <span>View more ({activities.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Activity Feed */}
      <div className="space-y-3">
        {visibleActivities.map((activity, index) => {
          const activityText = getActivityText(activity);
          const timeAgo = formatTimeAgo(activity.created_at);
          const actorAvatar = activity.meta?.actor_avatar;

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
              onClick={() => onActivityClick?.(activity)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  {actorAvatar ? (
                    <img
                      src={actorAvatar}
                      alt={activity.meta?.actor_name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                      {getAvatarFallback(activity.meta?.actor_name)}
                    </div>
                  )}
                  
                  {/* Activity type icon overlay */}
                  <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-1">
                    {getActivityIcon(activity.event_type)}
                  </div>
                </div>

                {/* Activity content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium">
                        {activityText.primary}
                      </p>
                      <p className="text-white/70 text-xs truncate">
                        {activityText.secondary}
                      </p>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/60 text-xs">
                        {timeAgo}
                      </p>
                      {activity.people_count && activity.people_count > 1 && (
                        <div className="flex items-center gap-1 text-white/50 text-xs mt-1">
                          <Users className="w-3 h-3" />
                          <span>{activity.people_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action indicator */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-white/60" />
                </div>
              </div>

              {/* Vibe tag if available */}
              {activity.vibe_tag && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="px-2 py-1 bg-white/10 rounded-full">
                    <span className="text-xs text-white/80 capitalize">
                      {activity.vibe_tag} vibe
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* View more button (alternative placement) */}
      {hasMoreActivities && onViewMore && (
        <motion.button
          onClick={onViewMore}
          className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>View all activity ({activities.length})</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
};