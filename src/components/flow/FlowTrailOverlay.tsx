// Snap-to trail overlay for a live flow.
// - Keeps a single line GeoJSON source & updates with setData
// - Keeps a small head marker for orientation
// - Handles style reloads safely

import React from 'react'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

const SRC = 'floq:flow:trail'
const LYR = 'floq:flow:trail:line'
const LYR_HEAD = 'floq:flow:trail:head'

type Pt = { lng:number; lat:number }

export default function FlowTrailOverlay({ points }: { points: Pt[] }) {
  const map = getCurrentMap()
  const line = React.useMemo(() => ({
    type:'FeatureCollection',
    features: [{
      type:'Feature' as const,
      geometry:{ type:'LineString' as const, coordinates: points.map(p=>[p.lng, p.lat]) },
      properties:{}
    }]
  }), [points])

  const head = React.useMemo(() => ({
    type:'FeatureCollection',
    features: points.length ? [{
      type:'Feature' as const,
      geometry:{ type:'Point' as const, coordinates: [points[points.length-1].lng, points[points.length-1].lat] },
      properties:{}
    }] : []
  }), [points])

  React.useEffect(() => {
    if (!map) return

    const add = () => {
      // sources
      if (!map.getSource(SRC)) map.addSource(SRC, { type:'geojson', data: line as any })
      else (map.getSource(SRC) as mapboxgl.GeoJSONSource).setData(line as any)

      if (!map.getSource(SRC+':head')) map.addSource(SRC+':head', { type:'geojson', data: head as any })
      else (map.getSource(SRC+':head') as mapboxgl.GeoJSONSource).setData(head as any)

      // line style
      if (!map.getLayer(LYR)) {
        map.addLayer({
          id: LYR,
          type: 'line',
          source: SRC,
          layout: { 'line-cap':'round', 'line-join':'round' },
          paint: {
            'line-color': '#ffffff',
            'line-opacity': 0.85,
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              10, 2.0,
              16, 5.0
            ]
          }
        })
      }

      // head style
      if (!map.getLayer(LYR_HEAD)) {
        map.addLayer({
          id: LYR_HEAD,
          type: 'circle',
          source: SRC+':head',
          paint:{
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 3,
              16, 6
            ],
            'circle-color': '#ffffff',
            'circle-stroke-color': '#000000',
            'circle-stroke-width': 1.5
          }
        })
      }
    }

    if (map.isStyleLoaded?.()) add()
    else map.once('style.load', add)

    return () => {
      try {
        if (map.getLayer(LYR)) map.removeLayer(LYR)
        if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD)
        if (map.getSource(SRC)) map.removeSource(SRC)
        if (map.getSource(SRC+':head')) map.removeSource(SRC+':head')
      } catch { }
    }
  }, [map, line, head])

  // live updates without re-adding layers
  React.useEffect(() => {
    const s = map?.getSource(SRC) as mapboxgl.GeoJSONSource | undefined
    s?.setData?.(line as any)
    const sh = map?.getSource(SRC+':head') as mapboxgl.GeoJSONSource | undefined
    sh?.setData?.(head as any)
  }, [map, line, head])

  return null
}
