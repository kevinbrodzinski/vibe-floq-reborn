import { useEffect, useState, useRef } from 'react'
import { distance } from '@/utils/geo'
// Mock learning data for now - replace with actual context when available
const mockPreferences = {
  focused: 0.8,
  energized: 0.6,
  calm: 0.4,
  social: 0.7,
  creative: 0.5
}
import { supabase } from '@/integrations/supabase/client'
import type { Cluster } from './useClusters'

interface ClusterSuggestion {
  cluster_id: string
  top_vibes: Array<{ vibe: string; count: number; score: number }>
  is_hot: boolean
  people_estimate: number
  centroid: { coordinates: [number, number] }
}

interface SmartSuggestion extends ClusterSuggestion {
  distance_meters: number
  relevance_score: number
}

export const useSmartSuggestions = (
  clusters: Cluster[],
  userLocation: { lat: number; lng: number } | null,
  maxDistanceMeters = 500
) => {
  const preferences = mockPreferences
  const [suggestion, setSuggestion] = useState<SmartSuggestion | null>(null)
  const [dismissedClusters, setDismissedClusters] = useState<Set<string>>(new Set())
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen for hot cluster notifications
  useEffect(() => {
    const channel = supabase
      .channel('smart-suggestions')
      .on('broadcast', { event: 'clusters_updated' }, async (payload) => {
        const hotClusters = payload.payload?.hot_clusters || []
        
        if (!userLocation || !hotClusters.length) return

        // Process hot clusters
        for (const hotCluster of hotClusters) {
          if (dismissedClusters.has(hotCluster.cluster_id)) continue

          try {
            const response = await fetch(
              `https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/cluster-suggestions/${hotCluster.cluster_id}`
            )
            
            if (!response.ok) continue

            const clusterSuggestion: ClusterSuggestion = await response.json()
            const distanceMeters = distance(
              userLocation,
              {
                lat: clusterSuggestion.centroid.coordinates[1],
                lng: clusterSuggestion.centroid.coordinates[0]
              }
            )

            if (distanceMeters <= maxDistanceMeters) {
              // Calculate relevance score based on user preferences
              const topVibe = clusterSuggestion.top_vibes[0]
              const userPreference = preferences[topVibe?.vibe] || 0
              const proximityScore = 1 - (distanceMeters / maxDistanceMeters)
              const hotBonus = clusterSuggestion.is_hot ? 0.3 : 0
              
              const relevanceScore = (userPreference * 0.4) + (proximityScore * 0.4) + (topVibe.score * 0.2) + hotBonus

              if (relevanceScore > 0.3) { // Minimum relevance threshold
                setSuggestion({
                  ...clusterSuggestion,
                  distance_meters: Math.round(distanceMeters),
                  relevance_score: Number(relevanceScore.toFixed(3))
                })

                // Set cooldown
                if (cooldownRef.current) clearTimeout(cooldownRef.current)
                cooldownRef.current = setTimeout(() => {
                  setSuggestion(null)
                }, 30000) // 30 second display time
                
                break // Only show one suggestion at a time
              }
            }
          } catch (error) {
            console.error('Error fetching cluster suggestion:', error)
          }
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current)
      }
    }
  }, [userLocation, maxDistanceMeters, preferences, dismissedClusters])

  const dismissSuggestion = (clusterId?: string) => {
    if (clusterId) {
      setDismissedClusters(prev => new Set([...prev, clusterId]))
      // Clear dismissal after 90 minutes
      setTimeout(() => {
        setDismissedClusters(prev => {
          const newSet = new Set(prev)
          newSet.delete(clusterId)
          return newSet
        })
      }, 90 * 60 * 1000)
    }
    setSuggestion(null)
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current)
      cooldownRef.current = null
    }
  }

  return {
    suggestion,
    dismissSuggestion
  }
}