import React from 'react'
import { Heart, Users, MapPin, Clock, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'

interface SerendipitousConnection {
  id: string
  personName: string
  personAvatar?: string
  connectionReason: string
  sharedInterests: string[]
  suggestedActivity: string
  suggestedTime: string
  suggestedLocation: string
  resonanceScore: number // Renamed from compatibilityScore
  mutualFriends: number
  frequentOverlap?: {
    location: string
    time: string
    frequency: string
  }
  vibePairing?: {
    vibe: string
    timeOfDay: string
    frequency: string
  }
}

interface SerendipityCardProps {
  connection: SerendipitousConnection
  onConnect: (connectionId: string) => void
  onSkip: (connectionId: string) => void
  onViewProfile: (connectionId: string) => void
}

export const SerendipityCard: React.FC<SerendipityCardProps> = ({
  connection,
  onConnect,
  onSkip,
  onViewProfile
}) => {
  const getResonanceColor = (score: number) => {
    if (score >= 90) return 'text-red-500'
    if (score >= 80) return 'text-orange-500'
    if (score >= 70) return 'text-yellow-500'
    return 'text-blue-500'
  }

  const getResonanceIcon = (score: number) => {
    if (score >= 90) return '💫'
    if (score >= 80) return '✨'
    if (score >= 70) return '🌟'
    return '⭐'
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">Today's Frequent Resonance Match</h3>
          <p className="text-white/70 text-sm">AI-powered pattern recognition</p>
        </div>
        <div className="ml-auto text-right">
          <div className={`text-2xl ${getResonanceColor(connection.resonanceScore)}`}>
            {getResonanceIcon(connection.resonanceScore)}
          </div>
          <div className={`text-sm font-bold ${getResonanceColor(connection.resonanceScore)}`}>
            {connection.resonanceScore}% resonance
          </div>
        </div>
      </div>

      {/* Person Info */}
      <div className="flex items-center gap-4 mb-6">
        {connection.personAvatar ? (
          <img
            src={connection.personAvatar}
            alt={connection.personName}
            className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-white/20">
            <span className="text-white font-bold text-xl">
              {connection.personName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h4 className="text-white font-bold text-lg">{connection.personName}</h4>
          <p className="text-white/80 text-sm">{connection.connectionReason}</p>
          <div className="flex items-center gap-2 mt-1">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-xs">{connection.mutualFriends} mutual friends</span>
          </div>
        </div>
      </div>

      {/* Shared Interests */}
      <div className="mb-6">
        <h5 className="text-white/90 font-medium text-sm mb-2">Shared Interests</h5>
        <div className="flex flex-wrap gap-2">
          {connection.sharedInterests.map((interest, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-white/10 rounded-full text-white/80 text-xs"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Frequent Overlap */}
      {connection.frequentOverlap && (
        <div className="mb-4 p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-white/90 font-medium text-sm">Frequent Overlap</span>
          </div>
          <div className="text-white/80 text-sm">
            <div className="font-medium">{connection.frequentOverlap.location}</div>
            <div className="text-white/60 text-xs">
              {connection.frequentOverlap.time} • {connection.frequentOverlap.frequency}
            </div>
          </div>
        </div>
      )}

      {/* Vibe Pairing */}
      {connection.vibePairing && (
        <div className="mb-4 p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🌅</span>
            <span className="text-white/90 font-medium text-sm">Vibe Pairing</span>
          </div>
          <div className="text-white/80 text-sm">
            <div className="font-medium">Both "{connection.vibePairing.vibe}" vibes</div>
            <div className="text-white/60 text-xs">
              {connection.vibePairing.timeOfDay} • {connection.vibePairing.frequency}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Activity */}
      <div className="bg-white/5 rounded-2xl p-4 mb-6">
        <h5 className="text-white/90 font-medium text-sm mb-2">Suggested Activity</h5>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-white/90 text-sm">{connection.suggestedActivity}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-white/70 text-sm">{connection.suggestedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-white/70 text-sm">{connection.suggestedLocation}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onSkip(connection.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-2xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Skip
        </button>
        
        <button
          onClick={() => onViewProfile(connection.id)}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-2xl transition-colors"
        >
          View Profile
        </button>
        
        <button
          onClick={() => onConnect(connection.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 transform hover:scale-105"
        >
          Connect
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* AI Insight */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-white/70 text-xs">
            AI detected perfect resonance based on your shared patterns, frequent locations, and vibe compatibility
          </span>
        </div>
      </div>
    </div>
  )
} 