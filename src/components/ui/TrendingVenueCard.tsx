import React from 'react'
import { Flame, Users, MapPin, Clock, Share2, Heart, MessageCircle } from 'lucide-react'
import { vibeToBorder } from '@/utils/vibeColors'

interface TrendingVenue {
  id: string
  name: string
  address: string
  vibe: string
  live_count: number
  trending_score: number
  distance_m: number
  photo_url?: string
  is_trending: boolean
  recent_activity: string
}

interface TrendingVenueCardProps {
  venue: TrendingVenue
  onJoin?: () => void
  onShare?: () => void
  onLike?: () => void
  onChat?: () => void
}

export const TrendingVenueCard: React.FC<TrendingVenueCardProps> = ({
  venue,
  onJoin,
  onShare,
  onLike,
  onChat
}) => {
  const getTrendingIcon = (score: number) => {
    if (score >= 90) return '🔥🔥🔥'
    if (score >= 70) return '🔥🔥'
    return '🔥'
  }

  const getTrendingColor = (score: number) => {
    if (score >= 90) return 'text-red-500'
    if (score >= 70) return 'text-orange-500'
    return 'text-yellow-500'
  }

  const borderClass = venue.vibe ? vibeToBorder(venue.vibe as any) : 'border-gray-500'

  return (
    <div className={`bg-card/80 backdrop-blur-xl rounded-3xl p-6 border ${borderClass} hover:glow-secondary transition-all duration-300 group`}>
      {/* Header with trending indicator */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {venue.is_trending && (
              <span className={`text-lg ${getTrendingColor(venue.trending_score)} animate-pulse`}>
                {getTrendingIcon(venue.trending_score)}
              </span>
            )}
            <h3 className="font-bold text-white text-lg">{venue.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{venue.distance_m}m away</span>
            <span>•</span>
            <span>{venue.recent_activity}</span>
          </div>
        </div>
        {venue.photo_url && (
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
            <img 
              src={venue.photo_url} 
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Live activity indicator */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Users className="w-4 h-4 text-white/70" />
          <span className="text-white/90 font-medium">{venue.live_count} people here</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-white/50" />
          <span className="text-white/50 text-sm">Live now</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        {onJoin && (
          <button
            onClick={onJoin}
            className="flex-1 bg-primary hover:bg-primary/80 text-white font-medium py-3 px-4 rounded-2xl transition-colors"
          >
            Join Now
          </button>
        )}
        <div className="flex gap-1">
          {onLike && (
            <button
              onClick={onLike}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Heart className="w-4 h-4 text-white" />
            </button>
          )}
          {onChat && (
            <button
              onClick={onChat}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-white" />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 