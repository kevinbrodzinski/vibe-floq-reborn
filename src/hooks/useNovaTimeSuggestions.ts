import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { generateTimeSuggestions } from '@/utils/stopTimeUtils'
import type { PlanStop } from '@/types/plan'

export interface NovaTimeSuggestion {
  stopId?: string
  startTime: string
  endTime: string
  confidence: number
  reason?: string
  venueType?: string
}

interface UseNovaTimeSuggestionsOptions {
  planId?: string
  enabled?: boolean
  refreshInterval?: number
}

export function useNovaTimeSuggestions({ 
  planId, 
  enabled = true,
  refreshInterval = 30000 // 30 seconds
}: UseNovaTimeSuggestionsOptions = {}) {
  return useQuery({
    queryKey: ['nova-time-suggestions', planId],
    queryFn: async (): Promise<NovaTimeSuggestion[]> => {
      if (!planId) return []

      // Fetch current plan stops
      const { data: stops, error } = await supabase
        .from('plan_stops')
        .select('*')
        .eq('plan_id', planId)
        .order('stop_order')

      if (error) throw error

      // Generate AI-powered suggestions
      const basicSuggestions = generateTimeSuggestions(planId, stops as PlanStop[])
      
      // Enhanced suggestions with venue data
      const enhancedSuggestions = await Promise.all(
        basicSuggestions.map(async (suggestion) => {
          // Try to get venue information for better suggestions
          const venueType = await getVenueTypeForTime(suggestion.startTime, stops as PlanStop[])
          
          return {
            ...suggestion,
            venueType,
            confidence: calculateEnhancedConfidence(suggestion, venueType, stops as PlanStop[])
          } as NovaTimeSuggestion
        })
      )

      return enhancedSuggestions.sort((a, b) => b.confidence - a.confidence)
    },
    enabled: enabled && !!planId,
    staleTime: refreshInterval,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false
  })
}

async function getVenueTypeForTime(timeSlot: string, stops: PlanStop[]): Promise<string> {
  // Simple heuristic based on time of day
  const hour = parseInt(timeSlot.split(':')[0])
  
  if (hour >= 7 && hour <= 11) return 'cafe'
  if (hour >= 12 && hour <= 14) return 'restaurant'
  if (hour >= 15 && hour <= 17) return 'gallery'
  if (hour >= 18 && hour <= 20) return 'restaurant'
  if (hour >= 21 && hour <= 23) return 'bar'
  if (hour >= 0 && hour <= 2) return 'club'
  
  return 'default'
}

function calculateEnhancedConfidence(
  suggestion: { confidence: number, startTime: string, reason?: string },
  venueType: string,
  existingStops: PlanStop[]
): number {
  let confidence = suggestion.confidence

  // Boost confidence for venue-appropriate times
  const hour = parseInt(suggestion.startTime.split(':')[0])
  const venueBoosts: Record<string, number[]> = {
    cafe: [8, 9, 10, 16], // Morning and afternoon
    restaurant: [12, 13, 18, 19, 20], // Lunch and dinner
    bar: [18, 19, 20, 21, 22], // Evening
    club: [22, 23, 0, 1, 2], // Late night
    gallery: [14, 15, 16, 17] // Afternoon
  }

  if (venueBoosts[venueType]?.includes(hour)) {
    confidence += 0.2
  }

  // Reduce confidence if too close to existing stops
  const hasNearbyStop = existingStops.some(stop => {
    const stopHour = parseInt((stop.start_time || '').split(':')[0])
    return Math.abs(stopHour - hour) <= 1
  })

  if (hasNearbyStop) {
    confidence -= 0.1
  }

  return Math.min(Math.max(confidence, 0), 1)
}

export function usePerfectFlowDetection(stops: PlanStop[]) {
  return useMemo(() => {
    if (stops.length < 2) return { isPerfectFlow: false, score: 0 }

    const sortedStops = [...stops].sort((a, b) => 
      (a.start_time || '').localeCompare(b.start_time || '')
    )

    let score = 1.0
    let gaps: number[] = []

    // Check timing gaps
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const current = sortedStops[i]
      const next = sortedStops[i + 1]
      
      const currentEnd = new Date(`2000-01-01T${current.end_time || current.start_time}`)
      const nextStart = new Date(`2000-01-01T${next.start_time}`)
      
      const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60) // minutes
      gaps.push(gap)
      
      // Ideal gap is 15-30 minutes
      if (gap < 0) score -= 0.3 // Overlap
      else if (gap > 120) score -= 0.2 // Too long gap
      else if (gap >= 15 && gap <= 30) score += 0.1 // Perfect gap
    }

    // Check for consistent spacing
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length
    
    if (gapVariance < 900) score += 0.1 // Low variance = consistent spacing

    const finalScore = Math.max(0, Math.min(1, score))
    return {
      isPerfectFlow: finalScore >= 0.8,
      score: finalScore,
      averageGap: avgGap,
      hasOverlaps: gaps.some(g => g < 0)
    }
  }, [stops])
}