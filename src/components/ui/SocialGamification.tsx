import React from 'react'
import { Trophy, Star, Target, Users, MapPin, Coffee, Music, Camera } from 'lucide-react'

interface Badge {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  progress: number
  maxProgress: number
  isUnlocked: boolean
  color: string
}

interface SocialGamificationProps {
  badges: Badge[]
  totalPoints: number
  level: number
  streak: number
}

export const SocialGamification: React.FC<SocialGamificationProps> = ({
  badges,
  totalPoints,
  level,
  streak
}) => {
  const getBadgeIcon = (badgeName: string) => {
    switch (badgeName.toLowerCase()) {
      case 'venue explorer':
        return <MapPin className="w-4 h-4" />
      case 'social butterfly':
        return <Users className="w-4 h-4" />
      case 'coffee connoisseur':
        return <Coffee className="w-4 h-4" />
      case 'music lover':
        return <Music className="w-4 h-4" />
      case 'photographer':
        return <Camera className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const unlockedBadges = badges.filter(badge => badge.isUnlocked)
  const lockedBadges = badges.filter(badge => !badge.isUnlocked)

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h3 className="font-bold text-white text-lg">Achievements</h3>
        </div>
        <div className="text-right">
          <div className="text-white font-bold text-lg">{totalPoints} pts</div>
          <div className="text-white/70 text-sm">Level {level}</div>
        </div>
      </div>

      {/* Streak indicator */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-white font-medium">{streak} day streak!</span>
          </div>
        </div>
      )}

      {/* Unlocked badges */}
      {unlockedBadges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-white/80 text-sm font-medium mb-3">Unlocked Badges</h4>
          <div className="grid grid-cols-2 gap-3">
            {unlockedBadges.slice(0, 4).map((badge) => (
              <div
                key={badge.id}
                className={`bg-gradient-to-br ${badge.color} rounded-2xl p-3 text-center`}
              >
                <div className="flex justify-center mb-2">
                  {badge.icon}
                </div>
                <div className="text-white font-medium text-xs">{badge.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h4 className="text-white/80 text-sm font-medium mb-3">In Progress</h4>
          <div className="space-y-3">
            {lockedBadges.slice(0, 3).map((badge) => (
              <div key={badge.id} className="bg-white/5 rounded-2xl p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-white/50">{badge.icon}</div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">{badge.name}</div>
                    <div className="text-white/60 text-xs">{badge.description}</div>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${badge.color}`}
                    style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                  ></div>
                </div>
                <div className="text-white/50 text-xs mt-1 text-right">
                  {badge.progress}/{badge.maxProgress}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 