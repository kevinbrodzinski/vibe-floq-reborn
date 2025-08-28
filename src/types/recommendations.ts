// Phase 3: Recommendations & Suggestions Types

export type ContextType = 'solo' | 'group'
export type TimeCtx = 'now' | 'morning' | 'afternoon' | 'evening' | 'late'

export type SmartActivitySuggestion = {
  id: string
  title: string
  description: string
  emoji?: string
  category?: string
  confidence: number // 0–1
  estimatedDuration?: string
  distance?: string
  energyLevel?: 'low' | 'medium' | 'high'
  reasoning?: string[]
  venueId?: string
  context?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type IntelligentFriendSuggestion = {
  profileId: string
  displayName: string
  username?: string
  avatarUrl?: string
  matchScore: number // 0–1
  reason: string
  sharedInterests: string[]
  mutualFriends?: number
  proximityScore?: number | null
  activityCompatibility?: number
  vibeCompatibility?: number
  recentActivity?: {
    lastSeen: string
    commonVenues: number
    sharedEvents: number
  }
  confidence: number
  connectionStrength: 'weak' | 'moderate' | 'strong'
}