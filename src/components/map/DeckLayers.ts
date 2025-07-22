import * as deckLayers from '@deck.gl/layers'
import {getClusterColor} from '@/utils/color'
import {usePulseTime} from '@/hooks/usePulseTime'
import type {Cluster} from '@/hooks/useClusters'

// Extract ScatterplotLayer from deck.gl layers
const ScatterplotLayer = (deckLayers as any).ScatterplotLayer

/** Static density circles (no animation) */
export const createDensityLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>,
  onClick?: (c: Cluster) => void
) => {
  if (!clusters.length) return null

  const maxTotal = Math.max(...clusters.map(c => c.total), 1)

  return new (ScatterplotLayer as any)({
    id: 'density',
    data: clusters,
    getPosition: d => d.centroid.coordinates,
    getRadius: d => Math.sqrt(d.total) * 80,
    radiusUnits: 'meters',
    getFillColor: d => [
      ...getClusterColor(d.total / maxTotal, d.vibe_counts, prefs),
      200
    ],
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 255],
    onClick: onClick ? info => onClick(info.object) : undefined
  })
}

export const usePulseLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>
) => {
  const t = usePulseTime(4)                    // 4 s loop

  // gate: only when <300 clusters and >0 clusters
  if (!clusters.length || clusters.length > 300) return null

  const top = [...clusters]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const maxTotal = top[0]?.total ?? 1
  const base = 120         // metres

  return new (ScatterplotLayer as any)({
    id: 'pulse',
    data: top,
    getPosition: d => d.centroid.coordinates,
    getRadius: d =>
      base + Math.sin(t * Math.PI * 2) * base * 0.6 * (d.total / maxTotal),
    radiusUnits: 'meters',
    opacity: 0.5,
    getFillColor: d => [
      ...getClusterColor(d.total / maxTotal, d.vibe_counts, prefs),
      120
    ],
    pickable: false,
    updateTriggers: {getRadius: t, getFillColor: [prefs]}
  })
}

/** Hotspot halo layer - animated rings around surging clusters */
export const createHaloLayer = (
  hotspots: any[],
  pulseTime: number,
  prefs: Record<string, number>
) => {
  if (!hotspots.length) return null

  const maxDelta = Math.max(...hotspots.map(h => h.delta), 1)

  return new (ScatterplotLayer as any)({
    id: 'hotspot-halos',
    data: hotspots,
    getPosition: d => d.centroid.coordinates,
    getRadius: d => {
      const baseRadius = Math.sqrt(d.total_now || d.user_cnt || 1) * 80
      const pulseMultiplier = 1 + Math.sin(pulseTime * Math.PI * 2) * 0.6 * (d.delta / maxDelta)
      return baseRadius * pulseMultiplier
    },
    radiusUnits: 'meters',
    getFillColor: d => [
      ...getClusterColor(d.delta / maxDelta, { [d.dom_vibe || 'none']: d.user_cnt || 1 }, prefs),
      Math.floor(120 + (d.delta / maxDelta) * 60) // Opacity based on surge intensity
    ],
    opacity: 0.35,
    pickable: false,
    updateTriggers: { getRadius: pulseTime, getFillColor: [prefs, hotspots] }
  })
}

// Individual exports for tree-shaking