// Phase 3: Intelligence & Personalization Types

export type TimeRange = '7d' | '30d' | '90d'

export type PersonalInsightRecommendation = {
  title: string
  description: string
  confidence: number // 0–100 (percentage)
  category: 'venue' | 'social' | 'timing' | 'activity' | string
}

export type PersonalInsightAchievement = {
  title: string
  description: string
  icon: string
  earnedAt: string // ISO or friendly
  category: 'social' | 'exploration' | 'activity' | string
}

export type PersonalInsights = {
  socialScore: number
  explorationLevel: number
  streakTrend: 'up' | 'down' | 'stable'
  streakChange: string
  newConnections: number

  peakEnergyTime: string
  peakEnergyWindow: string
  mostSocialDay: string
  favoriteVenueType: string
  avgVenueDistance: string
  explorationRate: number

  optimalSocialTime: string
  optimalExploreTime: string

  energyInsight?: string
  locationInsight?: string
  socialInsight?: string

  recommendations: PersonalInsightRecommendation[]
  achievements: PersonalInsightAchievement[]

  lastUpdated: string
  dataQuality: 'low' | 'medium' | 'high'
}

export type ProfileStats = {
  friend_count: number
  crossings_7d: number
  days_active_this_month: number
  most_active_vibe?: string
}