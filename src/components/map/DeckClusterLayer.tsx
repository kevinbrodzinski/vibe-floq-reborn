import * as deckLayers from '@deck.gl/layers'
import { scaleSequential } from 'd3-scale'
import type { Cluster } from '@/hooks/useClusters'

// Extract ScatterplotLayer from deck.gl layers
const ScatterplotLayer = (deckLayers as any).ScatterplotLayer

// Turbo colormap approximation (simplified)
const interpolateTurbo = (t: number): string => {
  // Simplified turbo colormap - purple to pink to yellow
  const r = Math.round(255 * Math.min(1, Math.max(0, 4 * t - 1.5)))
  const g = Math.round(255 * Math.min(1, Math.max(0, -2 * Math.abs(t - 0.5) + 1)))
  const b = Math.round(255 * Math.min(1, Math.max(0, -4 * t + 2.5)))
  return `rgb(${r}, ${g}, ${b})`
}

export function makeClusterLayer(clusters: Cluster[], onClick?: (c: Cluster) => void) {
  if (clusters.length === 0) return null             // 👉 no data, no layer, no WebGL warnings

  const max = Math.max(...clusters.map(c => c.total))
  const color = scaleSequential(interpolateTurbo).domain([1, max])

  return new (ScatterplotLayer as any)({
    id: 'vibe-clusters',
    data: clusters,
    getPosition: (d: Cluster) => d.centroid.coordinates,
    getRadius: (d: Cluster) => Math.sqrt(d.total) * 80,
    radiusUnits: 'meters',
    getFillColor: (d: Cluster) => {
      const colorStr = color(d.total)
      const rgb = colorStr.match(/\d+/g)?.map(Number) || [128, 128, 128]
      return [rgb[0], rgb[1], rgb[2], 180] as [number, number, number, number]
    },
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 255],
    onClick: onClick ? (info: any) => onClick(info.object) : undefined,
    updateTriggers: {
      getFillColor: [color],
      getRadius: clusters.length,
    },
  })
}