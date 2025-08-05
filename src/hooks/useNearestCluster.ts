import { useMemo } from 'react'
import { Cluster } from '@/hooks/useClusters'

export const useNearestCluster = (
  clusters: Cluster[],
  user: { lat: number; lng: number } | null,
  currentVibe: string | null
) => {
  return useMemo(() => {
    if (!user || clusters.length === 0) return null

    let best: Cluster | null = null
    let bestDist = Infinity

    for (const c of clusters) {
      const [lng, lat] = c.centroid.coordinates
      // Flat-earth distance approximation for speed (~10km accuracy)
      const d = 111_320 * Math.hypot(
        lat - user.lat, 
        (lng - user.lng) * Math.cos(user.lat * Math.PI / 180)
      )
      if (d < bestDist) {
        best = c
        bestDist = d
      }
    }

    return best ? { ...best, distance: bestDist } : null
  }, [clusters, user, currentVibe])
}