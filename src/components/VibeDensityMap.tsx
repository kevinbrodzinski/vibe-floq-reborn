import React, { useMemo } from 'react'
import type { Cluster } from '@/hooks/useClusters'

interface VibeDensityMapProps {
  clusters: Cluster[]
  viewport: {
    latitude: number
    longitude: number
    zoom: number
  }
}

export interface ClusterLayerConfig {
  id: string
  type: string
  data: Cluster[]
  getPosition: (d: Cluster) => [number, number]
  getRadius: (d: Cluster) => number
  radiusUnits: 'meters'
  getFillColor: (d: Cluster) => [number, number, number]
  getLineColor: [number, number, number, number]
  lineWidthMinPixels: number
  radiusMinPixels: number
  radiusMaxPixels: number
  transitions: {
    getRadius: number
    getFillColor: number
  }
  updateTriggers: {
    getRadius: number[]
    getFillColor: ([number, number, number] | undefined)[]
  }
}

export const useVibeDensityLayers = (clusters: Cluster[]) => {
  // Create deck.gl layer configuration for clusters with smooth transitions
  const clusterLayerConfig = useMemo((): ClusterLayerConfig | null => {
    if (!clusters.length) return null

    return {
      id: 'vibe-clusters',
      type: 'ScatterplotLayer',
      data: clusters,
      getPosition: (d: Cluster) => d.centroid.coordinates,
      getRadius: (d: Cluster) => Math.sqrt(d.total) * 80,
      radiusUnits: 'meters' as const,
      getFillColor: (d: Cluster) => d.fillRgb || [100, 150, 255],
      getLineColor: [255, 255, 255, 100] as [number, number, number, number],
      lineWidthMinPixels: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 100,
      // Smooth transitions for radius and color changes
      transitions: {
        getRadius: 600,        // 600ms transition
        getFillColor: 600      // 600ms color transition
      },
      updateTriggers: {
        getRadius: clusters.map(c => c.total),
        getFillColor: clusters.map(c => c.fillRgb)
      }
    }
  }, [clusters])

  // Hot-spot flash layer configuration (bonus feature)
  const flashLayerConfig = useMemo(() => {
    // This would show flashes for clusters that grew significantly
    // For now, we'll implement this as a placeholder
    return null
  }, [clusters])

  // Return layer configurations for deck.gl
  const layerConfigs = useMemo(() => {
    const configs: (ClusterLayerConfig | null)[] = []
    
    if (clusterLayerConfig) configs.push(clusterLayerConfig)
    if (flashLayerConfig) configs.push(flashLayerConfig)
    
    return configs.filter(Boolean) as ClusterLayerConfig[]
  }, [clusterLayerConfig, flashLayerConfig])

  return { layerConfigs }
}

// For backward compatibility
export const VibeDensityMap: React.FC<VibeDensityMapProps> = ({ clusters }) => {
  const { layerConfigs } = useVibeDensityLayers(clusters)
  return null // This component just provides the hook
}