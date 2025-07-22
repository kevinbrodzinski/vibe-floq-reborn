
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { MapView } from '@deck.gl/core'
import { X, ZoomIn, ZoomOut, LocateFixed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useClusters } from '@/hooks/useClusters'
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation'
import { createDensityLayer, usePulseLayer } from './DeckLayers'
import { ClusterLegend } from './ClusterLegend'
import { zIndex } from '@/constants/z'
import { useDebounce } from '@/hooks/useDebounce'

const DEFAULT_LOCATION = {
  longitude: -118.2437,
  latitude: 34.0522,
  zoom: 10,
  pitch: 0,
  bearing: 0,
}

type Coords = { lat: number; lng: number }

interface VibeDensityMapProps {
  isOpen: boolean
  onClose: () => void
  userLocation?: { lat: number; lng: number } | null
  className?: string
}

export const VibeDensityMap = ({
  isOpen,
  onClose,
  userLocation,
  className = '',
}: VibeDensityMapProps) => {
  const fallbackUserLocation = useOptimizedGeolocation()
  
  // Stable vibe preferences object
  const vibePrefs = useMemo(() => ({}), [])
  
  // Use provided userLocation or fallback to hook
  const currentUserLocation: Coords = 
    userLocation && userLocation.lat && userLocation.lng
      ? userLocation
      : fallbackUserLocation || { lat: DEFAULT_LOCATION.latitude, lng: DEFAULT_LOCATION.longitude }

  // Guard for valid coordinates (avoid Gulf of Guinea)
  const hasFix = !!(currentUserLocation?.lat && currentUserLocation?.lng && 
    !(currentUserLocation.lat === 0 && currentUserLocation.lng === 0))

  // Center on user location if available, fallback to LA
  const initialViewState = useMemo(() => ({
    longitude: hasFix ? currentUserLocation.lng : DEFAULT_LOCATION.longitude,
    latitude: hasFix ? currentUserLocation.lat : DEFAULT_LOCATION.latitude,
    zoom: hasFix ? 14 : DEFAULT_LOCATION.zoom,
    pitch: DEFAULT_LOCATION.pitch,
    bearing: DEFAULT_LOCATION.bearing,
  }), [hasFix, currentUserLocation?.lat, currentUserLocation?.lng])

  const [viewState, setViewState] = useState(initialViewState)
  const [hasCentered, setHasCentered] = useState(false)
  
  // Auto-center once when user location becomes available
  useEffect(() => {
    if (!hasCentered && hasFix) {
      setViewState(prev => ({
        ...prev,
        longitude: currentUserLocation.lng,
        latitude: currentUserLocation.lat,
        zoom: 14
      }))
      setHasCentered(true)
    }
  }, [hasFix, hasCentered])
  
  // Debounce viewport changes to reduce API calls
  const debouncedViewState = useDebounce(viewState, 300)

  // Calculate bounding box from debounced viewport
  const bbox = useMemo(() => {
    if (!debouncedViewState) return null
    
    const { longitude, latitude, zoom } = debouncedViewState
    const scale = Math.pow(2, 15 - zoom)
    const latOffset = scale * 0.01
    const lngOffset = scale * 0.01 / Math.cos((latitude * Math.PI) / 180)
    
    return [
      longitude - lngOffset, // west
      latitude - latOffset,  // south
      longitude + lngOffset, // east
      latitude + latOffset,  // north
    ] as [number, number, number, number]
  }, [debouncedViewState])

  const { clusters, loading, error } = useClusters(bbox, 6)

  // Handle viewport changes
  const handleViewChange = useCallback(({ viewState }: { viewState: any }) => {
    setViewState(viewState)
  }, [])

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 20) }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 2) }))
  }, [])

  const handleClusterClick = useCallback((cluster: any) => {
    // TODO: Implement cluster click behavior
    console.log('Cluster clicked:', cluster)
  }, [])

  const centerOnUser = useCallback(() => {
    if (hasFix) {
      setViewState(prev => ({
        ...prev,
        longitude: currentUserLocation.lng,
        latitude: currentUserLocation.lat,
        zoom: 14,
        transitionDuration: 1000,
        transitionEasing: (x: number) => 1 - Math.pow(1 - x, 3)
      }))
    }
  }, [hasFix, currentUserLocation?.lng, currentUserLocation?.lat])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Viewport persistence
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('vibeMapViewState', JSON.stringify(viewState))
    }
  }, [viewState, isOpen])

  useEffect(() => {
    const saved = localStorage.getItem('vibeMapViewState')
    if (saved) {
      try {
        const savedState = JSON.parse(saved)
        setViewState(savedState)
      } catch (e) {
        console.warn('Failed to restore saved viewport state')
      }
    }
  }, [])

  // Create deck.gl layers
  const pulseLayer = usePulseLayer(clusters, vibePrefs)
  const layers = useMemo(() => {
    if (!clusters?.length) return []
    const densityLayer = createDensityLayer(clusters, vibePrefs, handleClusterClick)
    return [densityLayer, pulseLayer].filter(Boolean)
  }, [clusters, pulseLayer, handleClusterClick])

  if (!isOpen) return null

  return (
    <div
      {...zIndex('modal')}
      role="dialog" 
      aria-label="Vibe Field - Pulse of the city"
      aria-modal="true"
      className={`fixed inset-4 bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${className}`}
    >
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 pointer-events-auto">
        <div>
          <CardTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Vibe Field
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Sensing the vibe..." : `${clusters?.length || 0} energy clusters detected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Close vibe field"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-accent/30 animate-pulse mx-auto"></div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Sensing the vibe...
                </p>
                <p className="text-sm text-muted-foreground">Tuning into the city's pulse</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <Card className="p-6 text-center max-w-sm mx-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-destructive mb-2 font-medium">Signal lost</p>
              <p className="text-sm text-muted-foreground mb-4">
                Couldn't connect to the vibe network. Try widening your orbit or check your connection.
              </p>
              <Button onClick={() => window.location.reload()} size="sm" variant="outline">
                Reconnect
              </Button>
            </Card>
          </div>
        )}

        {/* DeckGL Map */}
        <DeckGL
          initialViewState={viewState}
          onViewStateChange={handleViewChange}
          controller={true}
          layers={layers}
          views={new MapView()}
          getCursor={() => 'crosshair'}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        />

        {/* Floating Controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 pointer-events-auto">
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background hover:scale-105 transition-all"
            aria-label="Zoom in"
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 20) }))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="w-10 h-10 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background hover:scale-105 transition-all"
            aria-label="Zoom out"
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 2) }))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          {hasFix && (
            <Button
              size="icon"
              variant="secondary"
              className="w-10 h-10 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background hover:scale-105 transition-all"
              aria-label="Center on my location"
              onClick={centerOnUser}
            >
              <LocateFixed className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Cluster Legend */}
        {clusters && clusters.length > 0 && (
          <div className="absolute bottom-4 left-4 pointer-events-auto">
            <ClusterLegend clusters={clusters} />
          </div>
        )}
      </div>

      {/* Cosmic Stats Footer */}
      {clusters && clusters.length > 0 && (
        <CardContent className="pt-4 pb-4 pointer-events-auto border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-muted-foreground">
                {clusters.length} energy {clusters.length === 1 ? 'cluster' : 'clusters'}
              </span>
            </div>
            <span className="text-muted-foreground">
              {clusters.reduce((sum, c) => sum + c.total, 0)} souls in the field
            </span>
          </div>
        </CardContent>
      )}
    </div>
  )
}
