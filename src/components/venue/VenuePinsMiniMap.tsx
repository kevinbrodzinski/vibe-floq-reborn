import React from 'react'
import mapboxgl from 'mapbox-gl'
import { getMapboxToken } from '@/lib/geo/getMapboxToken'

type Pin = { id: string; loc?: { lng: number; lat: number } }

export function VenuePinsMiniMap({ 
  pins, 
  height = 200, 
  style = 'mapbox://styles/mapbox/dark-v11' 
}: {
  pins: Pin[]
  height?: number
  style?: string
}) {
  const divRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const [tokenReady, setTokenReady] = React.useState(false)

  // Initialize Mapbox token
  React.useEffect(() => {
    getMapboxToken().then(({ token }) => {
      mapboxgl.accessToken = token
      setTokenReady(true)
    }).catch(err => {
      console.error('Failed to get Mapbox token:', err)
    })
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

    return () => map.remove()
  }, [pins, style, tokenReady])

  if (!tokenReady) {
    return (
      <div 
        style={{ height, width: '100%', borderRadius: 10 }}
        className="bg-muted flex items-center justify-center"
      >
        <span className="text-xs text-muted-foreground">Loading map...</span>
      </div>
    )
  }

  return <div ref={divRef} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden' }} />
}