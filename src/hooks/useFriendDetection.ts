import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentUserId } from '@/hooks/useCurrentUser'

type FriendProfile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  distance_m?: number
  last_seen?: string | null
  is_live_sharing?: boolean
}

type FriendDetectionResult = {
  nearbyFriends: FriendProfile[]
  score: number
  confidence: number
  lastAnalysis?: Date
}

type AnalysisRow = {
  profile_low: string
  profile_high: string
  overall_score: number
  confidence_level: string
  signals_data: Record<string, any>
  relationship_type: string
  updated_at: string
}

export function useFriendDetection(lat?: number, lng?: number, radiusM = 500) {
  const currentUserId = useCurrentUserId()

  return useQuery<FriendDetectionResult>({
    queryKey: ['friend-detection', lat, lng, radiusM, currentUserId],
    enabled: !!lat && !!lng && !!currentUserId,
    queryFn: async (): Promise<FriendDetectionResult> => {
      if (!lat || !lng || !currentUserId) {
        return { nearbyFriends: [], score: 0, confidence: 0 }
      }

      const result: FriendDetectionResult = {
        nearbyFriends: [],
        score: 0,
        confidence: 0
      }

      // Get analysis for this user
      const userLow = currentUserId
      const userHigh = currentUserId
      
      const { data: existingAnalysis, error: analysisError } = await supabase
        .from('friendship_analysis')
        .select('profile_low, profile_high, overall_score, confidence_level, signals_data, relationship_type, updated_at')
        .eq('profile_low', userLow)
        .eq('profile_high', userHigh)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()
        .returns<Pick<AnalysisRow, 'profile_low' | 'profile_high' | 'overall_score' | 'confidence_level' | 'signals_data' | 'relationship_type' | 'updated_at'> | null>()

      if (analysisError) throw analysisError

      if (existingAnalysis) {
        const analysis = existingAnalysis
        result.score = analysis.overall_score
        result.confidence = parseFloat(analysis.confidence_level) || 0
        result.lastAnalysis = new Date(analysis.updated_at)
      }

      return result
    },
    staleTime: 60000,
    gcTime: 300000,
  })
}

// Export alias for compatibility
export const useFriendSuggestions = useFriendDetection
