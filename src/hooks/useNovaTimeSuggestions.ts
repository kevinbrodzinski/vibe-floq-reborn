import { useState, useEffect, useMemo } from 'react'
import { generateTimeSuggestions } from '@/lib/time-ai'
import type { PlanStop, NovaTimeSuggestion } from '@/types/plan'

export function useNovaTimeSuggestions(stops: PlanStop[], targetDuration: number = 90, venueType?: string) {
  const [suggestions, setSuggestions] = useState<NovaTimeSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  // Memoize suggestions to prevent unnecessary re-computation
  const memoizedSuggestions = useMemo(() => {
    if (stops.length === 0) return []
    return generateTimeSuggestions(stops, targetDuration, venueType)
  }, [stops.length, targetDuration, venueType, stops])

  useEffect(() => {
    if (memoizedSuggestions.length === 0) {
      setSuggestions([])
      return
    }

    const enhanceSuggestions = async () => {
      setLoading(true)
      
      try {
        // Enhance with venue metadata (simulated API call)
        const enhancedSuggestions = await Promise.all(
          memoizedSuggestions.map(async (suggestion) => {
            // Simulate venue API call with shorter timeout
            const venueData = await new Promise<any>(resolve => 
              setTimeout(() => resolve({
                type: venueType || 'general',
                peakHours: ['18:00-20:00', '21:00-23:00'],
                averageDuration: 90
              }), 50)
            )
            
            return {
              ...suggestion,
              venueMetadata: venueData,
              confidence: Math.min(suggestion.confidence + 0.1, 1.0)
            }
          })
        )
        
        setSuggestions(enhancedSuggestions)
      } catch (error) {
        console.error('Failed to generate Nova suggestions:', error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    enhanceSuggestions()
  }, [memoizedSuggestions])

  return {
    suggestions: suggestions.slice(0, 3), // Limit to top 3 suggestions
    loading,
    refreshSuggestions: () => {
      setSuggestions([])
    }
  }
}