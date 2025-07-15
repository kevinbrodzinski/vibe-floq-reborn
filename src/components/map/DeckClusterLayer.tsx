import * as deckLayers from '@deck.gl/layers'
import type { Cluster } from '@/hooks/useClusters'

// Extract ScatterplotLayer from deck.gl layers
const ScatterplotLayer = (deckLayers as any).ScatterplotLayer

export function createDeckClusterLayer(
  clusters: Cluster[],
  colorScale: (n: number) => [number, number, number],
  onClick?: (cluster: Cluster) => void
) {
  return new (ScatterplotLayer as any)({
    id: 'vibe-clusters',
    data: clusters,
    getPosition: (d: Cluster) => d.centroid.coordinates,
    getRadius: (d: Cluster) => Math.sqrt(d.total) * 80,
    radiusUnits: 'meters',
    getFillColor: (d: Cluster) => [...colorScale(d.total), 180] as [number, number, number, number],
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 255],
    onClick: onClick ? (info: any) => onClick(info.object) : undefined,
    updateTriggers: {
      getFillColor: [colorScale],
      getRadius: clusters.length,
    },
  })
}