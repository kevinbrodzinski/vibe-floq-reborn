import * as deckLayers from '@deck.gl/layers'
import type { Cluster } from '@/hooks/useClusters'

// Extract ScatterplotLayer from deck.gl layers
const ScatterplotLayer = (deckLayers as any).ScatterplotLayer

interface Props {
  clusters: Cluster[]
  colorScale: (n: number) => string
  onClick?: (cluster: Cluster) => void
}

export const createDeckClusterLayer = (clusters: Cluster[], colorScale: (n: number) => string, onClick?: (cluster: Cluster) => void) => {

  return new (ScatterplotLayer as any)({
    id: 'vibe-clusters',
    data: clusters,
    getPosition: (d: Cluster) => d.centroid.coordinates,
    getRadius: (d: Cluster) => Math.sqrt(d.total) * 80,
    radiusUnits: 'meters',
    getFillColor: (d: Cluster) => {
      const colorStr = colorScale(d.total)
      const rgb = colorStr.match(/\d+/g)?.map(Number) || [128, 128, 128]
      return [rgb[0], rgb[1], rgb[2], 180] as [number, number, number, number]
    },
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