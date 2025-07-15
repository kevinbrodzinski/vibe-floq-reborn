import * as deckLayers from '@deck.gl/layers'
import { useMemo } from 'react'
import { scaleSequential } from 'd3-scale'
import type { Cluster } from '@/hooks/useClusters'

// Extract ScatterplotLayer from the deck.gl layers module
const ScatterplotLayer = (deckLayers as any).ScatterplotLayer

// Debug import
console.log('ScatterplotLayer is', ScatterplotLayer, typeof ScatterplotLayer)

// Turbo colormap approximation (simplified)
const interpolateTurbo = (t: number): string => {
  // Simplified turbo colormap - purple to pink to yellow
  const r = Math.round(255 * Math.min(1, Math.max(0, 4 * t - 1.5)))
  const g = Math.round(255 * Math.min(1, Math.max(0, -2 * Math.abs(t - 0.5) + 1)))
  const b = Math.round(255 * Math.min(1, Math.max(0, -4 * t + 2.5)))
  return `rgb(${r}, ${g}, ${b})`
}

interface Props {
  clusters: Cluster[]
  onClick?: (cluster: Cluster, info: any) => void
}

export const DeckClusterLayer = ({ clusters, onClick }: Props) => {
  // Color scale based on cluster size
  const colorScale = useMemo(() => {
    const maxTotal = Math.max(...clusters.map((c) => c.total), 1)
    return scaleSequential((t: number) => interpolateTurbo(t)).domain([0, maxTotal])
  }, [clusters])

  // Create the layer
  const layer = useMemo(() => {
    return new ScatterplotLayer({
      id: 'vibe-clusters',
      data: clusters,
      getPosition: (d: Cluster) => d.centroid.coordinates,
      getRadius: (d: Cluster) => Math.sqrt(d.total) * 80, // radius in meters
      radiusUnits: 'meters',
      getFillColor: (d: Cluster) => {
        const colorStr = colorScale(d.total)
        const rgb = colorStr.match(/\d+/g)?.map(Number) || [128, 128, 128]
        return [rgb[0], rgb[1], rgb[2], 180] as [number, number, number, number]
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 255],
      onClick: onClick ? (info: any) => onClick(info.object, info) : undefined,
      updateTriggers: {
        getFillColor: [colorScale],
        getRadius: clusters.length,
      },
    })
  }, [clusters, colorScale, onClick])

  return layer
}