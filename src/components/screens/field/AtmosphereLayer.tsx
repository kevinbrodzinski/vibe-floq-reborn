import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { createPixiCustomLayer } from '@/lib/map/pixi/PixiCustomLayer'
import { BreathingSystem } from '@/lib/map/pixi/systems/BreathingSystem'
import { LightningSystem } from '@/lib/map/pixi/systems/LightningSystem'
import { TimeCrystal } from '@/lib/pixi/systems/TimeCrystal'
import { brand } from '@/lib/tokens/brand'

// Metrics tracking
let pixiContextLostCount = 0
let pixiReinitCount = 0

export type PixiLayerHandle = { 
  emit: (type: string, payload: any) => void
  setPaused?: (paused: boolean) => void
}

export const AtmosphereLayer = forwardRef<PixiLayerHandle, { weatherCells?: any[] }>(function AtmosphereLayer(
  { weatherCells }, ref
) {
  const map = getCurrentMap()
  const layerRef = useRef<any | null>(null)
  const isPausedRef = useRef(false)
  const rafIdRef = useRef<number>()

  useImperativeHandle(ref, () => ({
    emit: (type: string, payload: any) => layerRef.current?.emit?.(type, payload),
    setPaused: (paused: boolean) => { isPausedRef.current = paused }
  }), [])

  useEffect(() => {
    const PIXI_ENABLED = typeof window !== 'undefined' // Simple guard
    if (!map || layerRef.current || !PIXI_ENABLED) return

    const createAndAttachLayer = () => {
      const layer = createPixiCustomLayer({
        id: 'pixi-atmosphere',
        colorHex: brand.accent,
        deviceTier: 'mid'
      })
      layer.attach(new BreathingSystem({ colorHex: brand.primary }))
      layer.attach(new LightningSystem({ colorHex: brand.accent }))
      layer.attach(new TimeCrystal())

      // WebGL context loss handling
      const canvas = (layer as any).renderer?.view
      if (canvas) {
        canvas.addEventListener('webglcontextlost', (e: Event) => {
          e.preventDefault()
          pixiContextLostCount++
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[AtmosphereLayer] WebGL context lost', { totalLost: pixiContextLostCount })
          }
        })

        canvas.addEventListener('webglcontextrestored', () => {
          pixiReinitCount++
          if (process.env.NODE_ENV !== 'production') {
            console.log('[AtmosphereLayer] WebGL context restored, reinitializing', { totalReinits: pixiReinitCount })
          }
          // Re-create and attach systems
          setTimeout(() => createAndAttachLayer(), 0)
        })
      }

      return layer
    }

    const layer = createAndAttachLayer()

    try {
      map.addLayer(layer)
      layerRef.current = layer
    } catch (e) {
      console.warn('Failed to add Pixi layer', e)
    }

    const onStyle = () => {
      try {
        if (!map.getLayer('pixi-atmosphere')) {
          const repl = createAndAttachLayer()
          map.addLayer(repl)
          layerRef.current = repl
          
          // Restore weather cells if we have them
          if (weatherCells?.length) {
            const zoom = map.getZoom?.() ?? 14
            repl.updateCells(weatherCells, zoom)
          }
        }
      } catch (e) { 
        console.warn('Pixi reattach failed:', e) 
      }
    }

    // Handle visibility changes (pause when tab hidden)
    const onVisibilityChange = () => {
      isPausedRef.current = document.hidden
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[AtmosphereLayer] Visibility changed:', { paused: isPausedRef.current })
      }
    }
    
    map.on('style.load', onStyle)
    map.on('styledata', onStyle) // Also handle styledata events
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { 
      map.off('style.load', onStyle)
      map.off('styledata', onStyle)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = undefined
      }
      
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current.id)
        } catch (error) {
          console.warn('Failed to remove Pixi layer:', error)
        }
        layerRef.current = null
      }
    }
  }, [map])

  useEffect(() => {
    if (!layerRef.current || !weatherCells) return
    const zoom = map?.getZoom?.() ?? 14
    layerRef.current.updateCells(weatherCells, zoom)
  }, [weatherCells, map])

  return null
})