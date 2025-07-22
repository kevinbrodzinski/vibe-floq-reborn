
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
import { getClusterColor } from '@/utils/color'
import { vibeEmoji } from '@/utils/vibe'
import { zIndex } from '@/constants/z'
import { useDebounce } from '@/hooks/useDebounce'

const INITIAL_VIEW_STATE = {
  longitude: -118.2437,
  latitude: 34.0522,
  zoom: 10,
  pitch: 0,
  bearing: 0,
}

interface VibeDensityMapProps {
  isOpen: boolean
  onClose: () => void
}

export function VibeDensityMap({ isOpen, onClose }: VibeDensityMapProps) {
  const userLocation = useOptimizedGeolocation()
  
  // Center on user location if available, fallback to LA
  const initialViewState = useMemo(() => {
    if (userLocation.lat && userLocation.lng) {
      return {
        ...INITIAL_VIEW_STATE,
        longitude: userLocation.lng,
        latitude: userLocation.lat,
        zoom: 12,
      }
    }
    return INITIAL_VIEW_STATE
  }, [userLocation.lat, userLocation.lng])

  const [viewState, setViewState] = useState(initialViewState)
  
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

  const centerOnUser = useCallback(() => {
    if (userLocation.lat && userLocation.lng) {
      setViewState(v => ({
        ...v,
        longitude: userLocation.lng!,
        latitude: userLocation.lat!,
        zoom: 14,
      }))
    }
  }, [userLocation.lat, userLocation.lng])

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
  const layers = useMemo(() => {
    if (!clusters || clusters.length === 0) return []
    const densityLayer = createDensityLayer(clusters, {}, () => {})
    return [densityLayer].filter(Boolean)
  }, [clusters])

  if (!isOpen) return null

  return (
    <div
      {...zIndex('modal')}
      role="dialog"
      aria-label="Vibe density map"
      aria-modal="true"
      className={`fixed inset-4 bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden`}
    >
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-semibold">Vibe Density Map</CardTitle>
          {loading && (
            <Badge variant="secondary" className="text-xs">
              Loading...
            </Badge>
          )}
          {error && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close map"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Main map container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading skeleton */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading vibe clusters...</p>
            </div>
          </div>
        )}

        {/* DeckGL Map */}
        <DeckGL
          initialViewState={viewState}
          onViewStateChange={handleViewChange}
          controller={true}
          layers={layers}
          views={new MapView()}
          getCursor={() => 'default'}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        />

        {/* Zoom and location controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 pointer-events-auto">
          <Button
            size="icon"
            variant="secondary"
            onClick={zoomIn}
            aria-label="Zoom in"
            className="h-10 w-10 shadow-lg"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={zoomOut}
            aria-label="Zoom out"
            className="h-10 w-10 shadow-lg"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          {userLocation.lat && userLocation.lng && (
            <Button
              size="icon"
              variant="secondary"
              onClick={centerOnUser}
              aria-label="Center on my location"
              className="h-10 w-10 shadow-lg"
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Legend */}
        {clusters && clusters.length > 0 && (
          <div className="absolute bottom-4 left-4 pointer-events-auto">
            <ClusterLegend clusters={clusters} />
          </div>
        )}
      </div>

      {/* Stats footer */}
      {clusters && clusters.length > 0 && (
        <CardContent className="pt-4 pb-4 pointer-events-auto">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{clusters.length} active clusters</span>
            <span>
              {clusters.reduce((sum, c) => sum + c.total, 0)} people vibing
            </span>
          </div>
        </CardContent>
      )}
    </div>
  )
}
