import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { createPixiCustomLayer } from '@/lib/map/pixi/PixiCustomLayer'
import { BreathingSystem } from '@/lib/map/pixi/systems/BreathingSystem'
import { LightningSystem } from '@/lib/map/pixi/systems/LightningSystem'
import { TimeCrystal } from '@/lib/pixi/systems/TimeCrystal'
import { brand } from '@/lib/tokens/brand'
import { PIXI_ENABLED } from '@/lib/map/pixi/flags'

export type PixiLayerHandle = { emit: (type: string, payload: any) => void }

export const AtmosphereLayer = forwardRef<PixiLayerHandle, { weatherCells?: any[] }>(function AtmosphereLayer(
  { weatherCells }, ref
) {
  const map = getCurrentMap()
  const layerRef = useRef<any | null>(null)

  useImperativeHandle(ref, () => ({
    emit: (type: string, payload: any) => layerRef.current?.emit?.(type, payload)
  }), [])

  useEffect(() => {
    if (!map || layerRef.current || !PIXI_ENABLED) return

    const layer = createPixiCustomLayer({
      id: 'pixi-atmosphere',
      colorHex: brand.accent,
      deviceTier: 'mid'
    })
    layer.attach(new BreathingSystem({ colorHex: brand.primary }))
    layer.attach(new LightningSystem({ colorHex: brand.accent }))
    layer.attach(new TimeCrystal({ tier: 'mid' }))

    try {
      map.addLayer(layer)
      layerRef.current = layer
    } catch (e) {
      console.warn('Failed to add Pixi layer', e)
    }

    const onStyle = () => {
      try {
        if (!map.getLayer('pixi-atmosphere')) {
          const repl = createPixiCustomLayer({ id: 'pixi-atmosphere', colorHex: brand.accent, deviceTier: 'mid' })
          repl.attach(new BreathingSystem({ colorHex: brand.primary }))
          repl.attach(new LightningSystem({ colorHex: brand.accent }))
          repl.attach(new TimeCrystal({ tier: 'mid' }))
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
    
    map.on('style.load', onStyle)
    return () => { 
      map.off('style.load', onStyle)
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