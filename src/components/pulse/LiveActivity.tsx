import React, { useMemo } from 'react';
import { Activity, ChevronRight, MapPin, Clock } from 'lucide-react';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { cn } from '@/lib/utils';

interface FriendActivity {
  id: string;
  friendName: string;
  friendAvatar?: string;
  venueId?: string;
  venueName: string;
  activityType: 'checked_in' | 'joined_floq' | 'started_plan' | 'posted';
  timestamp: string;
  timeAgo: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface LiveActivityProps {
  maxItems?: number;
  onViewMore?: () => void;
  showViewMore?: boolean;
  className?: string;
}

// Helper to format time ago
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Mock data transformer - replace with real data mapping
const transformLiveData = (rawData: any[]): FriendActivity[] => {
  return rawData.map((item, index) => ({
    id: item.id || `activity-${index}`,
    friendName: item.user_name || item.friend_name || 'Unknown Friend',
    friendAvatar: item.user_avatar || item.friend_avatar,
    venueId: item.venue_id,
    venueName: item.venue_name || item.location_name || 'Unknown Location',
    activityType: item.event_type === 'checkin' ? 'checked_in' : 
                  item.event_type === 'floq_join' ? 'joined_floq' :
                  item.event_type === 'plan_start' ? 'started_plan' : 'posted',
    timestamp: item.created_at || item.timestamp || new Date().toISOString(),
    timeAgo: formatTimeAgo(item.created_at || item.timestamp || new Date().toISOString()),
    location: item.location ? {
      lat: item.location.lat || item.lat,
      lng: item.location.lng || item.lng
    } : undefined
  }));
};

const getActivityIcon = (type: FriendActivity['activityType']) => {
  switch (type) {
    case 'checked_in':
      return <MapPin className="w-4 h-4 text-green-400" />;
    case 'joined_floq':
      return <Activity className="w-4 h-4 text-blue-400" />;
    case 'started_plan':
      return <Clock className="w-4 h-4 text-purple-400" />;
    default:
      return <Activity className="w-4 h-4 text-white/60" />;
  }
};

const getActivityText = (activity: FriendActivity) => {
  switch (activity.activityType) {
    case 'checked_in':
      return `checked in at ${activity.venueName}`;
    case 'joined_floq':
      return `joined a floq at ${activity.venueName}`;
    case 'started_plan':
      return `started a plan at ${activity.venueName}`;
    default:
      return `posted at ${activity.venueName}`;
  }
};

export const LiveActivity: React.FC<LiveActivityProps> = ({
  maxItems = 3,
  onViewMore,
  showViewMore = true,
  className
}) => {
  const { data: rawLiveData = [] } = useLiveActivity();
  
  const activities = useMemo(() => {
    const transformed = transformLiveData(rawLiveData);
    return transformed.slice(0, maxItems);
  }, [rawLiveData, maxItems]);

  const totalCount = rawLiveData.length;
  const hasMore = totalCount > maxItems;

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Activity className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/50 text-sm">No recent activity</p>
        <p className="text-white/30 text-xs mt-1">Check back later for friend updates</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
        >
          {/* Friend Avatar */}
          <div className="flex-shrink-0">
            {activity.friendAvatar ? (
              <img
                src={activity.friendAvatar}
                alt={activity.friendName}
                className="w-10 h-10 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                {activity.friendName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {getActivityIcon(activity.activityType)}
              <div className="flex-1">
                <p className="text-white text-sm">
                  <span className="font-medium">{activity.friendName}</span>
                  {' '}
                  <span className="text-white/80">{getActivityText(activity)}</span>
                </p>
                <p className="text-white/50 text-xs mt-1">{activity.timeAgo}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* View More Button */}
      {showViewMore && hasMore && onViewMore && (
        <button
          onClick={onViewMore}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-white/70 hover:text-white text-sm font-medium"
        >
          View {totalCount - maxItems} more activities
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};