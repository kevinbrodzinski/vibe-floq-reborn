import React from 'react'
import { Heart, Users, TrendingUp } from 'lucide-react'

interface RelationshipStrength {
  profileId: string
  displayName: string
  strength: number
  isPublic: boolean
}

interface RelationshipStrengthSummaryProps {
  relationships: RelationshipStrength[]
  maxDisplay?: number
}

export const RelationshipStrengthSummary: React.FC<RelationshipStrengthSummaryProps> = ({
  relationships,
  maxDisplay = 5
}) => {
  const topRelationships = relationships
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxDisplay)

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'bg-red-500'
    if (strength >= 60) return 'bg-orange-500'
    if (strength >= 40) return 'bg-yellow-500'
    if (strength >= 20) return 'bg-blue-500'
    return 'bg-gray-500'
  }

  const getStrengthLabel = (strength: number) => {
    if (strength >= 80) return 'Best Friends'
    if (strength >= 60) return 'Close Friends'
    if (strength >= 40) return 'Good Friends'
    if (strength >= 20) return 'Acquaintances'
    return 'New Connection'
  }

  if (relationships.length === 0) {
    return null
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/20">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Top Relationships</h3>
          <p className="text-sm text-white/70">{relationships.length} connections</p>
        </div>
      </div>

      {/* Top relationships */}
      <div className="space-y-3">
        {topRelationships.map((relationship, index) => (
          <div key={relationship.profileId} className="flex items-center gap-3">
            {/* Rank */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white/90 text-xs font-medium">{index + 1}</span>
            </div>

            {/* Name and strength bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/90 text-sm font-medium truncate">
                  {relationship.displayName}
                </span>
                <span className="text-white/50 text-xs">
                  {relationship.strength}%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${getStrengthColor(relationship.strength)}`}
                  style={{ width: `${relationship.strength}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white/50 text-xs">
                  {getStrengthLabel(relationship.strength)}
                </span>
                {relationship.isPublic && (
                  <Users className="w-3 h-3 text-white/30" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats summary */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-white">
              {relationships.filter(r => r.strength >= 80).length}
            </div>
            <div className="text-white/50 text-xs">Best Friends</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {Math.round(relationships.reduce((sum, r) => sum + r.strength, 0) / relationships.length)}
            </div>
            <div className="text-white/50 text-xs">Avg Strength</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {relationships.filter(r => r.isPublic).length}
            </div>
            <div className="text-white/50 text-xs">Public</div>
          </div>
        </div>
      </div>
    </div>
  )
} 