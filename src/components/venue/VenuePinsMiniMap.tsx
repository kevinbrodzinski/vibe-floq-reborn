'use client'
import React from 'react'
import mapboxgl from 'mapbox-gl'
import { getMapboxStyle } from '@/lib/geo/mapboxConfig'

type Pin = { id: string; loc?: { lng: number; lat: number } }

async function getMapboxToken() {
  const env = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!env) throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN')
  return { token: env }
}

export function VenuePinsMiniMap({ 
  pins, 
  height = 200, 
  style = getMapboxStyle()
}: {
  pins: Pin[]
  height?: number
  style?: string
}) {
  // Only render if we have venues with locations
  const hasLoc = pins.some(p => p.loc)
  if (!hasLoc) return null

  const divRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const [tokenReady, setTokenReady] = React.useState(false)

  // Initialize Mapbox token
  React.useEffect(() => {
    let mounted = true
    getMapboxToken().then(({ token }) => {
      if (!mounted) return
      mapboxgl.accessToken = token
      setTokenReady(true)
    }).catch(err => {
      console.error('Mapbox token error:', err)
    })
    return () => { mounted = false }
  }, [])

  React.useEffect(() => {
    if (!divRef.current || mapRef.current || !tokenReady) return
    const pts = pins.filter(p => p.loc).map(p => [p.loc!.lng, p.loc!.lat] as [number, number])
    if (!pts.length) return

    const map = new mapboxgl.Map({
      container: divRef.current,
      style,
      interactive: false,
      attributionControl: false,
      pitch: 0,
    })
    mapRef.current = map

    map.on('load', () => {
      if (pts.length === 1) {
        map.setCenter(pts[0])
        map.setZoom(14)
      } else {
        const b = new mapboxgl.LngLatBounds()
        pts.forEach(p => b.extend(p))
        map.fitBounds(b, { padding: 24, duration: 0 })
      }
      pts.forEach(p => new mapboxgl.Marker({ scale: 0.85 }).setLngLat(p).addTo(map))
    })

    return () => { 
      map.remove()
      mapRef.current = null
    }
  }, [pins, style, tokenReady])

  if (!tokenReady) {
    return (
      <div 
        style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden' }}
        className="flex items-center justify-center text-white/70 text-xs bg-black/20 border border-white/10"
      >
        Loading map…
      </div>
    )
  }

  return <div ref={divRef} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden' }} />
}