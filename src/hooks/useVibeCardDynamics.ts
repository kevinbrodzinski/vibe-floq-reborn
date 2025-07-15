import { usePulseTime } from './usePulseTime'
import { useNearestCluster } from './useNearestCluster'
import { getClusterColor } from '@/utils/color'

export const useVibeCardDynamics = (
  clusters: any[],
  userLoc: { lat: number; lng: number } | null,
  currentVibe: string | null,
  prefs: Record<string, number> = {}
) => {
  const t = usePulseTime(4) // 0→1→0 over 4 seconds
  const nearest = useNearestCluster(clusters, userLoc, currentVibe)

  // Performance guard: static values for too many clusters or far distances
  if (!nearest || clusters.length > 300 || nearest.distance > 2000) {
    return {
      pulseScale: 1,
      pulseOpacity: 0.3,
      tintColor: null,
      showGlow: false
    }
  }

  // Proximity factor: 0→1 as distance goes 200m→0m  
  const prox = Math.max(0, 1 - nearest.distance / 200)
  
  // Density factor: 0→1 as total goes 0→15 people
  const dens = Math.min(1, nearest.total / 15)

  // Pulse dynamics
  const pulseScale = 1 + prox * dens * 0.5 * Math.sin(t * Math.PI * 2) // +50% max amplitude
  const pulseOpacity = 0.3 + prox * dens * 0.4 // 0.3→0.7 range

  // Color blending using our existing color system
  const totalMax = Math.max(...clusters.map(c => c.total), 1)
  const densityNorm = nearest.total / totalMax
  const clusterRgb = getClusterColor(densityNorm, nearest.vibe_counts, prefs)
  
  // Create CSS color-mix for 20% blend
  const tintColor = `rgb(${clusterRgb.join(', ')})`

  // Soft glow when close and dense
  const showGlow = nearest.distance < 200 && nearest.total >= 3

  return {
    pulseScale,
    pulseOpacity,
    tintColor,
    showGlow
  }
}