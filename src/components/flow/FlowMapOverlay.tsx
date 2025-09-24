import React from 'react'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import type { ConvergencePoint } from '@/lib/flow/types'

const SRC = 'floq:convergence'
const LYR = 'floq:convergence:circle'

export function FlowMapOverlay({ points, onPointTap }: {
  points: ConvergencePoint[]
  onPointTap?: (p: ConvergencePoint) => void
}) {
  const map = getCurrentMap()

  const fc = React.useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: (points ?? []).map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { prob: p.prob, eta: p.etaMin, group: p.groupMin }
    }))
  }), [points])

  React.useEffect(() => {
    if (!map) return

    let rafId: number | null = null
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    const addLayers = () => {
      // source
      if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: fc as any })
      else (map.getSource(SRC) as mapboxgl.GeoJSONSource).setData(fc as any)

      // base layer
      if (!map.getLayer(LYR)) {
        map.addLayer({
          id: LYR,
          type: 'circle',
          source: SRC,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['get', 'prob'],
              0.2, isMobile ? 12 : 8,
              0.6, isMobile ? 16 : 12,
              0.9, isMobile ? 20 : 16
            ],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'prob'],
              0.2, 'rgba(147,197,253,0.6)',
              0.6, 'rgba(99,102,241,0.7)',
              0.9, 'rgba(236,72,153,0.8)'
            ],
            'circle-blur': 0.4,
            'circle-stroke-color': 'rgba(255,255,255,0.9)',
            'circle-stroke-width': [
              'interpolate', ['linear'], ['get', 'prob'],
              0.2, 1, 0.9, 2
            ],
            'circle-opacity': [
              'interpolate', ['linear'], ['get', 'prob'],
              0.2, 0.7, 0.9, 0.9
            ]
          }
        })

        // pulsing animation
        let phase = 0
        const animate = () => {
          phase += 0.05
          if (map.getLayer(LYR)) {
            const base = isMobile ? 12 : 8
            const pulse = [
              'interpolate', ['linear'], ['get', 'prob'],
              0.2, base + Math.sin(phase) * 2,
              0.6, (base + 4) + Math.sin(phase) * 3,
              0.9, (base + 8) + Math.sin(phase) * 4
            ]
            map.setPaintProperty(LYR, 'circle-radius', pulse as any)
          }
          rafId = requestAnimationFrame(animate)
        }
        animate()

        // tap handlers (optional)
        if (onPointTap) {
          const handler = (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [LYR] })
            if (!features.length) return
            const f = features[0]
            const coords = (f.geometry as any).coordinates
            onPointTap({
              lng: coords[0], lat: coords[1],
              prob: f.properties?.prob ?? 0,
              etaMin: f.properties?.eta ?? 0,
              groupMin: f.properties?.group ?? 0,
            })
          }
          map.on('click', LYR, handler)
          map.on('touchend', LYR, handler)

          // one unified cleanup
          return () => {
            if (rafId) cancelAnimationFrame(rafId)
            try {
              map.off('click', LYR, handler)
              map.off('touchend', LYR, handler)
              if (map.getLayer(LYR)) map.removeLayer(LYR)
              if (map.getSource(SRC)) map.removeSource(SRC)
            } catch {}
          }
        }
      }

      // default cleanup if no handler created
      return () => {
        if (rafId) cancelAnimationFrame(rafId)
        try {
          if (map.getLayer(LYR)) map.removeLayer(LYR)
          if (map.getSource(SRC)) map.removeSource(SRC)
        } catch {}
      }
    }

    if (map.isStyleLoaded?.()) return addLayers()
    let cleanup: any
    const onLoad = () => { cleanup = addLayers() }
    map.once('style.load', onLoad)

    return () => {
      if (cleanup) cleanup()
      else map.off('style.load', onLoad)
    }
  }, [map, fc, onPointTap])

  return null
}