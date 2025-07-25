import React, { useState } from 'react'
import { Heart, Users, Star, Shield, Eye, EyeOff, Settings } from 'lucide-react'

interface RelationshipStrength {
  userId: string
  displayName: string
  avatarUrl?: string
  strength: number // 0-100
  interactionCount: number
  lastInteraction: string
  mutualFriends: number
  sharedInterests: string[]
  isPublic: boolean
}

interface RelationshipStrengthIndicatorProps {
  relationship: RelationshipStrength
  onTogglePrivacy?: (userId: string, isPublic: boolean) => void
  showDetails?: boolean
}

export const RelationshipStrengthIndicator: React.FC<RelationshipStrengthIndicatorProps> = ({
  relationship,
  onTogglePrivacy,
  showDetails = false
}) => {
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false)

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-red-500'
    if (strength >= 60) return 'text-orange-500'
    if (strength >= 40) return 'text-yellow-500'
    if (strength >= 20) return 'text-blue-500'
    return 'text-gray-400'
  }

  const getStrengthLabel = (strength: number) => {
    if (strength >= 80) return 'Best Friends'
    if (strength >= 60) return 'Close Friends'
    if (strength >= 40) return 'Good Friends'
    if (strength >= 20) return 'Acquaintances'
    return 'New Connection'
  }

  const getStrengthIcon = (strength: number) => {
    if (strength >= 80) return <Heart className="w-4 h-4 fill-current" />
    if (strength >= 60) return <Star className="w-4 h-4 fill-current" />
    if (strength >= 40) return <Users className="w-4 h-4" />
    return <Users className="w-4 h-4" />
  }

  const handlePrivacyToggle = () => {
    onTogglePrivacy?.(relationship.userId, !relationship.isPublic)
    setShowPrivacyMenu(false)
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-4 border border-white/20 hover:glow-secondary transition-all duration-300">
      {/* Header with privacy controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {relationship.avatarUrl ? (
            <img
              src={relationship.avatarUrl}
              alt={relationship.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {relationship.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-white">{relationship.displayName}</h3>
            <p className="text-white/70 text-sm">{getStrengthLabel(relationship.strength)}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {relationship.isPublic ? (
              <Eye className="w-4 h-4 text-green-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-orange-400" />
            )}
          </button>
          
          {showPrivacyMenu && (
            <div className="absolute right-0 top-full mt-2 bg-card/95 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-xl z-50 min-w-48">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-white/70" />
                <span className="text-white/90 text-sm font-medium">Privacy Settings</span>
              </div>
              <button
                onClick={handlePrivacyToggle}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                {relationship.isPublic ? (
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
                {relationship.isPublic 
                  ? "Others can see your relationship strength"
                  : "Only you can see this relationship strength"
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strength indicator */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`${getStrengthColor(relationship.strength)}`}>
            {getStrengthIcon(relationship.strength)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/70">Relationship Strength</span>
              <span className={`font-medium ${getStrengthColor(relationship.strength)}`}>
                {relationship.strength}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStrengthColor(relationship.strength)}`}
                style={{ width: `${relationship.strength}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Details (if enabled) */}
      {showDetails && (
        <div className="space-y-2 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Interactions</span>
            <span className="text-white/90 font-medium">{relationship.interactionCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Mutual Friends</span>
            <span className="text-white/90 font-medium">{relationship.mutualFriends}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Last Interaction</span>
            <span className="text-white/90 font-medium">{relationship.lastInteraction}</span>
          </div>
          
          {relationship.sharedInterests.length > 0 && (
            <div className="pt-2">
              <span className="text-white/70 text-sm">Shared Interests:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {relationship.sharedInterests.slice(0, 3).map((interest, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
                  >
                    {interest}
                  </span>
                ))}
                {relationship.sharedInterests.length > 3 && (
                  <span className="text-white/50 text-xs">
                    +{relationship.sharedInterests.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 