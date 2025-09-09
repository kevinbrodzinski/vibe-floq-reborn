import React from 'react'
import type { ConvergencePoint } from '@/lib/flow/types'

const SRC_CONV = 'floq:flow:convergence'
const LYR_CONV = 'floq:flow:convergence:pulse'

interface FlowMapOverlayProps {
  points: ConvergencePoint[]
  map?: mapboxgl.Map | null
}

export function FlowMapOverlay({ points, map }: FlowMapOverlayProps) {
  const fc = React.useMemo(() => ({
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { 
        prob: p.prob, 
        eta: p.etaMin, 
        group: p.groupMin,
        // Add pulse animation phase based on probability
        phase: Math.random() * Math.PI * 2
      }
    }))
  }), [points])

  React.useEffect(() => {
    if (!map) return

    let rafId: number | null = null

    const addLayers = () => {
      try {
        // Add or update source
        if (!map.getSource(SRC_CONV)) {
          map.addSource(SRC_CONV, { 
            type: 'geojson', 
            data: fc as any 
          })
        } else {
          (map.getSource(SRC_CONV) as mapboxgl.GeoJSONSource)?.setData(fc as any)
        }

        // Add convergence layer if not exists
        if (!map.getLayer(LYR_CONV)) {
          map.addLayer({
            id: LYR_CONV,
            type: 'circle',
            source: SRC_CONV,
            paint: {
              'circle-radius': [
                'interpolate', 
                ['linear'], 
                ['get', 'prob'],
                0.2, 8,
                0.6, 12,
                0.9, 16
              ],
              'circle-color': [
                'interpolate', 
                ['linear'], 
                ['get', 'prob'],
                0.2, 'rgba(147,197,253,0.6)',  // light blue
                0.6, 'rgba(99,102,241,0.7)',   // indigo  
                0.9, 'rgba(236,72,153,0.8)'    // pink
              ],
              'circle-blur': 0.4,
              'circle-stroke-color': 'rgba(255,255,255,0.9)',
              'circle-stroke-width': [
                'interpolate',
                ['linear'],
                ['get', 'prob'],
                0.2, 1,
                0.9, 2
              ],
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'prob'],
                0.2, 0.7,
                0.9, 0.9
              ]
            }
          })

          // Add pulsing animation
          let animationPhase = 0
          const animate = () => {
            animationPhase += 0.05
            
            if (map.getLayer(LYR_CONV)) {
              const pulseRadius = [
                'interpolate',
                ['linear'],
                ['get', 'prob'],
                0.2, 8 + Math.sin(animationPhase) * 2,
                0.6, 12 + Math.sin(animationPhase) * 3,
                0.9, 16 + Math.sin(animationPhase) * 4
              ]
              
              map.setPaintProperty(LYR_CONV, 'circle-radius', pulseRadius)
            }
            
            rafId = requestAnimationFrame(animate)
          }
          animate()
        }
      } catch (error) {
        console.warn('[FlowMapOverlay] Failed to add layers:', error)
      }
    }

    if (map.isStyleLoaded?.()) {
      addLayers()
    } else {
      map.once('style.load', addLayers)
    }

    // Cleanup function
    return () => {
      if (rafId) cancelAnimationFrame(rafId)  // ✅ cancel RAF
      try {
        if (map.getLayer(LYR_CONV)) {
          map.removeLayer(LYR_CONV)
        }
        if (map.getSource(SRC_CONV)) {
          map.removeSource(SRC_CONV)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [map, fc])

  return null
}