import React from 'react'
import { Users, MapPin, Clock, TrendingUp, Activity } from 'lucide-react'
import { secureBoldify } from '@/utils/secureTextRenderer'

interface LiveActivity {
  id: string
  type: 'checkin' | 'venue_activity' | 'friend_joined' | 'trending'
  user_name?: string
  venue_name: string
  activity_text: string
  timestamp: string
  avatar_url?: string
  vibe?: string
  venue_id?: string
}

interface LiveActivityFeedProps {
  activities: LiveActivity[]
  maxItems?: number
  onCardClick?: (activity: LiveActivity) => void
  boldEntities?: boolean
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  activities,
  maxItems = 5,
  onCardClick,
  boldEntities = false
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'checkin':
        return <MapPin className="w-4 h-4 text-green-400" />
      case 'venue_activity':
        return <Activity className="w-4 h-4 text-blue-400" />
      case 'friend_joined':
        return <Users className="w-4 h-4 text-purple-400" />
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-orange-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'checkin':
        return 'border-green-500/20 bg-green-500/10'
      case 'venue_activity':
        return 'border-blue-500/20 bg-blue-500/10'
      case 'friend_joined':
        return 'border-purple-500/20 bg-purple-500/10'
      case 'trending':
        return 'border-orange-500/20 bg-orange-500/10'
      default:
        return 'border-gray-500/20 bg-gray-500/10'
    }
  }

  const displayedActivities = activities.slice(0, maxItems)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <h3 className="font-semibold text-white">Live Activity</h3>
      </div>
      {displayedActivities.map((activity) => {
        const cardProps = onCardClick
          ? { onClick: () => onCardClick(activity), role: 'button', tabIndex: 0, className: `cursor-pointer flex items-start gap-3 p-3 rounded-2xl border ${getActivityColor(activity.type)} backdrop-blur-sm transition-all duration-300 hover:scale-105 focus:ring-2 focus:ring-primary` }
          : { className: `flex items-start gap-3 p-3 rounded-2xl border ${getActivityColor(activity.type)} backdrop-blur-sm transition-all duration-300 hover:scale-105` };
        return (
          <div key={activity.id} {...cardProps}>
            <div className="flex-shrink-0">
              {activity.avatar_url ? (
                <img
                  src={activity.avatar_url}
                  alt={activity.user_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm leading-relaxed">
                {secureBoldify(activity.activity_text, {
                  user_name: activity.user_name || '',
                  venue_name: activity.venue_name || ''
                })}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/50 text-xs">{activity.timestamp}</span>
                {activity.vibe && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="text-white/50 text-xs capitalize">{activity.vibe}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {activities.length === 0 && (
        <div className="text-center py-8 text-white/50">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No live activity right now</p>
          <p className="text-sm">Check back soon for updates!</p>
        </div>
      )}
    </div>
  )
} 