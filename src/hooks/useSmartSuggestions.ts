import { useEffect, useState, useRef, useCallback } from 'react'
import { distance } from '@/utils/geo'
import { supabase } from '@/integrations/supabase/client'
import { useUserLocation } from './useUserLocation'
import type { VibeSuggestion } from '@/components/vibe/SuggestionToast'

// Mock learning data for now - replace with actual context when available
const mockPreferences = {
  focused: 0.8,
  energized: 0.6,
  calm: 0.4,
  social: 0.7,
  creative: 0.5
}

interface ClusterSuggestion {
  cluster_id: string
  top_vibes: Array<{ vibe: string; count: number; score: number }>
  is_hot: boolean
  people_estimate: number
  centroid: { coordinates: [number, number] }
}

const COOLDOWN_MS = 90_000 // 90 seconds

export const useSmartSuggestions = (maxDistanceMeters = 500) => {
  const preferences = mockPreferences
  const [suggestionQueue, setSuggestionQueue] = useState<VibeSuggestion[]>([])
  const [dismissedClusters, setDismissedClusters] = useState<Record<string, number>>({})
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { location } = useUserLocation()

  // Helper: mark dismissed
  const dismissSuggestion = useCallback((clusterId: string) => {
    setDismissedClusters(prev => ({ ...prev, [clusterId]: Date.now() }))
    setSuggestionQueue(prev => prev.filter(s => s.clusterId !== clusterId))
    
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current)
      cooldownRef.current = null
    }
  }, [])

  // Listen for backend broadcast
  useEffect(() => {
    if (!location) return

    const channel = supabase
      .channel('clusters-updates-live')
      .on('broadcast', { event: 'clusters_updated' }, async (payload) => {
        const hotClusters = payload.payload?.hot_clusters as
          | { cluster_id: string; vibe_hint: string }[]
          | undefined

        if (!hotClusters || !location) return

        for (const hc of hotClusters) {
          // Cooldown check
          if (
            dismissedClusters[hc.cluster_id] &&
            Date.now() - dismissedClusters[hc.cluster_id] < COOLDOWN_MS
          ) continue

          try {
            // Fetch detailed suggestion data
            const response = await fetch(
              `https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/cluster-suggestions/${hc.cluster_id}`
            )
            
            if (!response.ok) continue

            const clusterSuggestion: ClusterSuggestion = await response.json()
            
            // Distance gate
            const distanceMeters = distance(
              { lat: location.coords.latitude, lng: location.coords.longitude },
              {
                lat: clusterSuggestion.centroid.coordinates[1],
                lng: clusterSuggestion.centroid.coordinates[0]
              }
            )

            if (distanceMeters > maxDistanceMeters) continue

            // Calculate relevance score
            const topVibe = clusterSuggestion.top_vibes[0]
            const userPreference = preferences[topVibe?.vibe] || 0
            const proximityScore = 1 - (distanceMeters / maxDistanceMeters)
            const hotBonus = clusterSuggestion.is_hot ? 0.3 : 0
            
            const relevanceScore = (userPreference * 0.4) + (proximityScore * 0.4) + (topVibe.score * 0.2) + hotBonus

            if (relevanceScore > 0.3) { // Minimum relevance threshold
              const newSuggestion: VibeSuggestion = {
                clusterId: hc.cluster_id,
                vibe: hc.vibe_hint,
                distanceMeters: Math.round(distanceMeters),
                peopleEstimate: clusterSuggestion.people_estimate,
                isHot: clusterSuggestion.is_hot
              }

              setSuggestionQueue(prev => {
                // Only add if not already in queue
                if (prev.some(s => s.clusterId === newSuggestion.clusterId)) return prev
                return [newSuggestion] // Replace any existing suggestion
              })

              // Set cooldown
              if (cooldownRef.current) clearTimeout(cooldownRef.current)
              cooldownRef.current = setTimeout(() => {
                setSuggestionQueue([])
              }, 30000) // 30 second display time
              
              break // Only show one suggestion at a time
            }
          } catch (error) {
            console.error('Error fetching cluster suggestion:', error)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current)
      }
    }
  }, [location, dismissedClusters, maxDistanceMeters, preferences])

  /** Apply: switch user vibe & delegate to caller */
  const applyVibe = useCallback((suggestion: VibeSuggestion) => {
    dismissSuggestion(suggestion.clusterId)
    return suggestion
  }, [dismissSuggestion])

  return { 
    suggestionQueue, 
    dismissSuggestion, 
    applyVibe,
    // Legacy support
    suggestion: suggestionQueue[0] || null
  }
}