import { supabase } from '@/integrations/supabase/client'

interface LogSnapSuggestionParams {
  planId: string
  stopId: string
  originalTime: string
  snappedTime: string
  confidence?: number
  reason?: string
}

export function useLogSnapSuggestion() {
  const logSnapSuggestion = async ({
    planId,
    stopId,
    originalTime,
    snappedTime,
    confidence,
    reason = 'nova_suggestion'
  }: LogSnapSuggestionParams) => {
    try {
      // Guard against empty planId/stopId (new plans before save)
      if (!planId || !stopId) {
        console.warn('Snap logging skipped: missing planId or stopId')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('snap_suggestion_logs')
        .insert({
          user_id: user.id,
          plan_id: planId,
          stop_id: stopId,
          original_time: originalTime,
          snapped_time: snappedTime,
          confidence,
          reason,
          source: 'nova'
        })

      if (error) throw error
    } catch (err) {
      console.error('Snap usage logging failed:', err)
    }
  }

  return { logSnapSuggestion }
}