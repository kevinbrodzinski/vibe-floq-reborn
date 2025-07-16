import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences'
import { useCallback } from 'react'

export function useNovaSnap() {
  const { data: prefs } = useUserPreferences()
  const { mutate: updatePrefs } = useUpdateUserPreferences()

  const preferSmartSuggestions = prefs?.feedback_sentiment?.prefer_suggestions ?? true

  const recordNovaSnap = useCallback((planId: string, stopId: string, matchStrength: number) => {
    const currentFeedback = prefs?.feedback_sentiment || {}
    
    updatePrefs({
      feedback_sentiment: {
        ...currentFeedback,
        nova_snap_match: {
          planId,
          stopId,
          matchStrength,
          usedAt: new Date().toISOString(),
        },
      },
    })
  }, [prefs, updatePrefs])

  const toggleSmartSuggestions = useCallback(() => {
    const currentFeedback = prefs?.feedback_sentiment || {}
    
    updatePrefs({
      feedback_sentiment: {
        ...currentFeedback,
        prefer_suggestions: !preferSmartSuggestions,
      },
    })
  }, [prefs, updatePrefs, preferSmartSuggestions])

  return {
    preferSmartSuggestions,
    recordNovaSnap,
    toggleSmartSuggestions,
  }
}