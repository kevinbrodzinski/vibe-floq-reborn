// src/hooks/useFriendDetection.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentUserId } from '@/hooks/useCurrentUser'
import type { Row } from '@/types/util'

/** DB row helpers */
type AnalysisRow = Row<'friendship_analysis'>
type AnalysisPick = Pick<
  AnalysisRow,
  | 'profile_low'
  | 'profile_high'
  | 'overall_score'
  | 'confidence_level'
  | 'signals_data'
  | 'relationship_type'
  | 'updated_at'
>

/** Minimal friend profile shape used by the UI */
export type FriendProfile = {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  distance_m?: number | null
  last_seen?: string | null
  is_live_sharing?: boolean | null
}

/** Return shape for the hook */
export type FriendDetectionResult = {
  nearbyFriends: FriendProfile[]
  score: number
  confidence: number
  lastAnalysis?: Date
}

export function useFriendDetection(lat?: number, lng?: number, radiusM = 500) {
  const currentUserId = useCurrentUserId()

  return useQuery<FriendDetectionResult>({
    queryKey: ['friend-detection', lat, lng, radiusM, currentUserId],
    enabled: !!lat && !!lng && !!currentUserId,
    staleTime: 60_000,
    gcTime: 300_000,
    queryFn: async (): Promise<FriendDetectionResult> => {
      if (!lat || !lng || !currentUserId) {
        return { nearbyFriends: [], score: 0, confidence: 0 }
      }

      const result: FriendDetectionResult = {
        nearbyFriends: [],
        score: 0,
        confidence: 0,
      }

      // If your schema stores a "canonical ordering" for pairs, apply it here.
      // For now we just use the same id on both sides.
      const userLow: AnalysisRow['profile_low'] = currentUserId as AnalysisRow['profile_low']
      const userHigh: AnalysisRow['profile_high'] = currentUserId as AnalysisRow['profile_high']

      // Pull the most recent analysis within the last 24h
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: existingAnalysis, error: analysisError } = await supabase
        .from('friendship_analysis')
        .select(
          'profile_low, profile_high, overall_score, confidence_level, signals_data, relationship_type, updated_at'
        )
        .eq('profile_low', userLow)
        .eq('profile_high', userHigh)
        .gte('updated_at', sinceIso)
        .maybeSingle()
        .returns<AnalysisPick | null>()

      if (analysisError) throw analysisError

      if (existingAnalysis) {
        result.score = existingAnalysis.overall_score ?? 0
        // confidence_level can be a string/decimal in some schemas
        const conf =
          typeof existingAnalysis.confidence_level === 'number'
            ? existingAnalysis.confidence_level
            : parseFloat(String(existingAnalysis.confidence_level))
        result.confidence = Number.isFinite(conf) ? (conf as number) : 0
        result.lastAnalysis = new Date(existingAnalysis.updated_at)
      }

      // If you later add an RPC/view for nearby friend profiles, wire it here
      // and populate result.nearbyFriends with its typed output.

      return result
    },
  })
}

/** Aliases for legacy imports */
export const useFriendSuggestions = useFriendDetection
export const useFriendsDetection = useFriendDetection
