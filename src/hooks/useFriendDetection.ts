// src/hooks/useFriendDetection.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentUserId } from '@/hooks/useCurrentUser'
import type { Row } from '@/types/util'

/** DB row helpers */
type AnalysisRow = Row<'friendship_analysis'>
type AnalysisPick = Pick<
  AnalysisRow,
  | 'user_low'
  | 'user_high'
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
  const me = useCurrentUserId()

  return useQuery<FriendDetectionResult>({
    queryKey: ['friend-detection', lat, lng, radiusM, me],
    enabled: !!lat && !!lng && !!me,
    staleTime: 60_000,
    gcTime: 300_000,
    queryFn: async (): Promise<FriendDetectionResult> => {
      if (!lat || !lng || !me) return { nearbyFriends: [], score: 0, confidence: 0 }

      const sinceIso = new Date(Date.now() - 86_400_000).toISOString()

      const { data: analysis, error } = await supabase
        .from('friendship_analysis')
        .select('user_low,user_high,overall_score,confidence_level,signals_data,relationship_type,updated_at')
        .eq('user_low',  me as AnalysisRow['user_low'])
        .eq('user_high', me as AnalysisRow['user_high'])
        .gte('updated_at', sinceIso)
        .maybeSingle()
        .returns<AnalysisPick | null>()

      if (error) throw error

      const res: FriendDetectionResult = { nearbyFriends: [], score: 0, confidence: 0 }

      if (analysis) {
        res.score = analysis.overall_score ?? 0
        const conf =
          typeof analysis.confidence_level === 'number'
            ? analysis.confidence_level
            : parseFloat(String(analysis.confidence_level))
        res.confidence = Number.isFinite(conf) ? conf : 0
        res.lastAnalysis = new Date(analysis.updated_at)
      }

      // TODO: populate nearbyFriends when RPC/view is ready.
      return res
    },
  })
}

/** Aliases for legacy imports */
export const useFriendSuggestions = useFriendDetection
export const useFriendsDetection = useFriendDetection
