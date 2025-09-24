import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences'
import { useLogSnapSuggestion } from '@/hooks/useLogSnapSuggestion'
import { useCallback } from 'react'

export function useNovaSnap() {
  const { data: prefs } = useUserPreferences()
  const { mutate: updatePrefs } = useUpdateUserPreferences()
  const { logSnapSuggestion } = useLogSnapSuggestion()

  const preferSmartSuggestions = prefs?.prefer_smart_suggestions ?? false

  const recordNovaSnap = useCallback(async (planId: string, stopId: string, matchStrength: number, originalTime?: string, snappedTime?: string) => {
    // Log to the new snap_suggestion_logs table
    if (originalTime && snappedTime) {
      await logSnapSuggestion({
        planId,
        stopId,
        originalTime,
        snappedTime,
        confidence: Math.min(100, Math.round(matchStrength * 100 * 100) / 100), // Convert to percentage and cap at 100
        reason: 'nova_suggestion'
      })
    }

    // Also update user preferences for backward compatibility
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
  }, [prefs, updatePrefs, logSnapSuggestion])

  const toggleSmartSuggestions = useCallback(() => {
    console.log('useNovaSnap: Toggling smart suggestions from', preferSmartSuggestions, 'to', !preferSmartSuggestions)
    updatePrefs({
      prefer_smart_suggestions: !preferSmartSuggestions,
    })
  }, [updatePrefs, preferSmartSuggestions])

  return {
    preferSmartSuggestions,
    recordNovaSnap,
    toggleSmartSuggestions,
  }
}