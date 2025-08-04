import React, { useState } from 'react'
import { Heart, Users, MessageCircle, MapPin, Calendar, Star, Eye, EyeOff, Shield, HeartOff } from 'lucide-react'
import { CloseFriendToggle } from '@/components/CloseFriends/CloseFriendToggle'
import { useIsCloseFriend } from '@/hooks/useCloseFriends'

interface RelationshipAttributes {
  interactionFrequency: number // 0-100
  mutualFriends: number
  sharedInterests: number // 0-100
  messageActivity: number // 0-100
  locationOverlap: number // 0-100
  timeSpentTogether: number // 0-100
}

interface FriendRelationshipStrengthProps {
  friendId: string
  friendName: string
  avatarUrl?: string
  overallStrength: number // 0-100
  attributes: RelationshipAttributes
  isPublic: boolean
  onTogglePrivacy?: (isPublic: boolean) => void
}

export const FriendRelationshipStrength: React.FC<FriendRelationshipStrengthProps> = ({
  friendId,
  friendName,
  avatarUrl,
  overallStrength,
  attributes,
  isPublic,
  onTogglePrivacy
}) => {
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false)
  const { data: isCloseFriend = false } = useIsCloseFriend(friendId)

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-red-500'
    if (strength >= 60) return 'text-orange-500'
    if (strength >= 40) return 'text-yellow-500'
    if (strength >= 20) return 'text-blue-500'
    return 'text-gray-400'
  }

  const getStrengthLabel = (strength: number) => {
    // If they're marked as close friend, show that regardless of calculated strength
    if (isCloseFriend) return 'Close Friend'
    if (strength >= 80) return 'Best Friends'
    if (strength >= 60) return 'Close Friends'
    if (strength >= 40) return 'Good Friends'
    if (strength >= 20) return 'Acquaintances'
    return 'New Connection'
  }

  const getStrengthIcon = (strength: number) => {
    if (strength >= 80) return <Heart className="w-5 h-5 fill-current" />
    if (strength >= 60) return <Star className="w-5 h-5 fill-current" />
    return <Users className="w-5 h-5" />
  }

  const attributeConfig = [
    {
      key: 'interactionFrequency',
      label: 'Interaction Frequency',
      icon: <Users className="w-4 h-4" />,
      value: attributes.interactionFrequency
    },
    {
      key: 'sharedInterests',
      label: 'Shared Interests',
      icon: <Star className="w-4 h-4" />,
      value: attributes.sharedInterests
    },
    {
      key: 'messageActivity',
      label: 'Message Activity',
      icon: <MessageCircle className="w-4 h-4" />,
      value: attributes.messageActivity
    },
    {
      key: 'locationOverlap',
      label: 'Location Overlap',
      icon: <MapPin className="w-4 h-4" />,
      value: attributes.locationOverlap
    },
    {
      key: 'timeSpentTogether',
      label: 'Time Together',
      icon: <Calendar className="w-4 h-4" />,
      value: attributes.timeSpentTogether
    }
  ]

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      {/* Header with privacy controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={friendName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {friendName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-lg">Relationship with {friendName}</h3>
              {isCloseFriend && <Heart className="w-4 h-4 text-red-400 fill-current" />}
            </div>
            <p className="text-white/70 text-sm">{getStrengthLabel(overallStrength)}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {isPublic ? (
              <Eye className="w-5 h-5 text-green-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-orange-400" />
            )}
          </button>
          
          {showPrivacyMenu && (
            <div className="absolute right-0 top-full mt-2 bg-card/95 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-xl z-50 min-w-48">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-white/70" />
                <span className="text-white/90 text-sm font-medium">Privacy Settings</span>
              </div>
              <button
                onClick={() => {
                  onTogglePrivacy?.(!isPublic)
                  setShowPrivacyMenu(false)
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                {isPublic ? (
                  <>
                    <EyeOff className="w-4 h-4 text-orange-400" />
                    <span className="text-white/90 text-sm">Make Private</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-green-400" />
                    <span className="text-white/90 text-sm">Make Public</span>
                  </>
                )}
              </button>
              <div className="text-white/50 text-xs mt-2">
                {isPublic 
                  ? "Others can see your relationship strength"
                  : "Only you can see this relationship strength"
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overall strength indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`${getStrengthColor(overallStrength)}`}>
            {getStrengthIcon(overallStrength)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Overall Relationship Strength</span>
              <span className={`font-bold ${getStrengthColor(overallStrength)}`}>
                {overallStrength}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getStrengthColor(overallStrength)}`}
                style={{ width: `${overallStrength}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship attributes */}
      <div className="space-y-4">
        <h4 className="text-white/90 font-medium">Relationship Attributes</h4>
        
        {attributeConfig.map((attr) => (
          <div key={attr.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-white/70">{attr.icon}</div>
                <span className="text-white/80 text-sm">{attr.label}</span>
              </div>
              <span className="text-white/60 text-sm">{attr.value}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStrengthColor(attr.value)}`}
                style={{ width: `${attr.value}%` }}
              ></div>
            </div>
          </div>
        ))}

        {/* Mutual friends */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-white/80 text-sm">Mutual Friends</span>
            </div>
            <span className="text-white/90 font-medium">{attributes.mutualFriends}</span>
          </div>
        </div>
      </div>

      {/* Close Friend Actions */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white/90 font-medium">Close Friend Status</h4>
          <CloseFriendToggle 
            friendId={friendId}
            friendName={friendName}
            variant="minimal"
          />
        </div>
        {isCloseFriend && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <Heart className="w-4 h-4 fill-current" />
              <span className="font-medium">{friendName} is one of your close friends</span>
            </div>
            <p className="text-red-300/80 text-xs mt-1">
              They'll see your close friends content and appear first in your feed
            </p>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <h4 className="text-white/90 font-medium mb-3">Relationship Insights</h4>
        <div className="space-y-2 text-sm">
          {isCloseFriend && (
            <p className="text-red-400">❤️ {friendName} is one of your close friends!</p>
          )}
          {overallStrength >= 80 && (
            <p className="text-green-400">🌟 You have a very strong friendship with {friendName}!</p>
          )}
          {attributes.sharedInterests >= 70 && (
            <p className="text-blue-400">🎯 You share many interests with {friendName}</p>
          )}
          {attributes.locationOverlap >= 60 && (
            <p className="text-purple-400">📍 You often visit the same places</p>
          )}
          {attributes.messageActivity < 30 && (
            <p className="text-yellow-400">💬 Consider reaching out more to strengthen your connection</p>
          )}
          {attributes.mutualFriends >= 5 && (
            <p className="text-orange-400">👥 You have a strong social network overlap</p>
          )}
        </div>
      </div>
    </div>
  )
} 