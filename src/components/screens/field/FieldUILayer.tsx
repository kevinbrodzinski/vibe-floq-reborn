import React, { useRef, useMemo, useCallback } from 'react'
import { useFieldData } from '@/components/screens/field/FieldDataProvider'
import { useFieldLens } from '@/components/field/FieldLensProvider'
import { ExploreDrawer } from '@/components/field/ExploreDrawer'
import { ConstellationCanvas } from '@/components/overlays/ConstellationCanvas'
import { ConstellationController } from '@/components/overlays/ConstellationController'
import { TemporalController } from '@/components/Temporal/TemporalController'
import type { PixiLayerHandle } from '@/components/screens/field/AtmosphereLayer'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

// Chooser + persistence
import { VenueChooserPanel } from '@/components/venue/VenueChooserPanel'
import { listVenueFavorites, toggleVenueFavorite } from '@/lib/api/venueFavorites'
import { createShortlist } from '@/lib/api/venueShortlists'
import { useToast } from '@/hooks/use-toast'
import { mapTileToLite } from '@/lib/venues/mapTileToLite'

// Flow system imports
import { FlowExploreChips } from '@/components/flow/FlowExploreChips'
import { FlowMapOverlay } from '@/components/flow/FlowMapOverlay'
import { fetchFlowVenues, fetchConvergence } from '@/lib/api/flow'
import type { FlowFilters, ConvergencePoint, TileVenue } from '@/lib/flow/types'

export function FieldUILayer() {
  const data = useFieldData()
  const { lens } = useFieldLens()
  const pixiRef = useRef<PixiLayerHandle>(null)
  const map = getCurrentMap()

  // Chooser + favorites state
  const { toast } = useToast()
  const [chooserOpen, setChooserOpen] = React.useState(false)
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set<string>())
  const [chooserAnchorPid, setChooserAnchorPid] = React.useState<string | null>(null)
  
  // Focus management refs
  const changeBtnRef = React.useRef<HTMLButtonElement>(null)
  const firstChooserBtnRef = React.useRef<HTMLButtonElement>(null)

  // Flow state for explore lens
  const [filters, setFilters] = React.useState<FlowFilters>({ 
    friendFlows: true, 
    weatherPref: [] 
  })
  const [flowVenues, setFlowVenues] = React.useState<TileVenue[]>([])
  const [convergence, setConvergence] = React.useState<ConvergencePoint[]>([])
  
  // Memoized venue mapping for performance
  const venueLite = useMemo(() => {
    return data.nearbyVenues?.map(mapTileToLite) ?? []
  }, [data.nearbyVenues])

  // Combined venues: prioritize Flow venues when available, fallback to static venues
  const displayVenues = useMemo(() => {
    return flowVenues.length > 0 ? flowVenues : data.nearbyVenues ?? []
  }, [flowVenues, data.nearbyVenues])

  React.useEffect(() => {
    let mounted = true
    listVenueFavorites()
      .then(set => mounted && setFavoriteIds(set))
      .catch(()=>{})
    return () => { mounted = false }
  }, [])

  // Fetch flow data when map moves or filters change (explore lens only)
  React.useEffect(() => {
    if (!map || lens !== 'explore') return
    
    let cancel = false
    const loadFlowData = async () => {
      try {
        const bounds = map.getBounds?.()
        const zoom = map.getZoom?.() ?? 14
        if (!bounds) return
        
        const bbox: [number,number,number,number] = [
          bounds.getWest(), 
          bounds.getSouth(), 
          bounds.getEast(), 
          bounds.getNorth()
        ]
        
        const [{ venues }, { points }] = await Promise.all([
          fetchFlowVenues({ bbox, filters }),
          fetchConvergence({ bbox, zoom })
        ])
        
        if (!cancel) { 
          setFlowVenues(venues)
          setConvergence(points)
        }
      } catch (error) {
        console.error('Failed to load flow data:', error)
        // Gracefully degrade to static venues
        if (!cancel) {
          setFlowVenues([])
          setConvergence([])
        }
      }
    }

    const debounced = () => { 
      clearTimeout((debounced as any)._t)
      ;(debounced as any)._t = setTimeout(loadFlowData, 250)
    }

    debounced()
    map.on?.('moveend', debounced)
    
    return () => { 
      cancel = true
      map.off?.('moveend', debounced)
      clearTimeout((debounced as any)._t)
    }
  }, [map, filters, lens])

  const handleToggleFavorite = useCallback(async (venueId: string, next: boolean) => {
    setFavoriteIds(prev => { const n = new Set(prev); next ? n.add(venueId) : n.delete(venueId); return n })
    try { await toggleVenueFavorite(venueId, next) }
    catch {
      setFavoriteIds(prev => { const n = new Set(prev); next ? n.delete(venueId) : n.add(venueId); return n })
      toast({ title: 'Error', description: 'Could not update favorite', variant: 'destructive' })
    }
  }, [toast])

  const handleSaveShortlist = useCallback(async (name: string, venueIds: string[]) => {
    try { await createShortlist(name, venueIds); toast({ title: 'Success', description: 'Shortlist saved' }) }
    catch { toast({ title: 'Error', description: 'Failed to save shortlist', variant: 'destructive' }) }
  }, [toast])

  const handleChangeVenue = useCallback((pid: string) => {
    setChooserAnchorPid(pid)
    setChooserOpen(true)
  }, [])

  const closeChooser = useCallback(() => {
    setChooserOpen(false)
    changeBtnRef.current?.focus()
  }, [])

  // Focus management + ESC handler + scroll lock
  React.useEffect(() => {
    if (!chooserOpen) return
    
    // Focus first button
    const timer = setTimeout(() => {
      firstChooserBtnRef.current?.focus()
    }, 100)
    
    // ESC to close
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') closeChooser() 
    }
    document.addEventListener('keydown', onKey)
    
    // Scroll lock
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    
    return () => { 
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = orig
    }
  }, [chooserOpen, closeChooser])

  return (
    <>
      {/* Flow explore chips - only show in explore lens */}
      {lens === 'explore' && (
        <FlowExploreChips value={filters} onChange={setFilters} />
      )}

      {/* Explore lens */}
      {lens === 'explore' && displayVenues.length > 0 && (
        <div id="lens-panel-explore" role="tabpanel" aria-labelledby="tab-explore">
          <ExploreDrawer
            venues={displayVenues}
            onJoin={(pid) => { /* TODO: join flow */ }}
            onSave={(pid) => { handleToggleFavorite(pid, true) }}
            onPlan={(pid) => { /* TODO: planning flow */ }}
            onChangeVenue={handleChangeVenue}
            changeBtnRef={changeBtnRef}
          />

          {/* Flow convergence overlay */}
          <FlowMapOverlay points={convergence} map={map} />

          {/* Venue chooser overlay (inline) */}
          {chooserOpen && (
            <div className="fixed left-0 right-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[610] flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[520px] px-4">
                <VenueChooserPanel
                  option={{
                    kind: 'planned' as any,
                    text: 'Pick a venue',
                    score: 0.5,
                    friction: 'low',
                    successProb: 0.6,
                    rationale: ['Personalized picks'],
                    payload: chooserAnchorPid ? { venueId: chooserAnchorPid } : {}
                  }}
                  venues={venueLite}
                  focus={undefined} // optional
                  excludeVenueId={(chooserAnchorPid ?? undefined) || null}
                  onSelect={(venue) => {
                    toast({ title: 'Selected', description: `Selected ${venue.name}` })
                    closeChooser()
                  }}
                  onPreview={(venue) => {
                    toast({ title: 'Preview', description: `Preview ${venue.name}` })
                    // OPTIONAL: center map on venue.loc
                  }}
                  onClose={closeChooser}
                  currentVibe="social"
                  bias="neutral"
                  favoriteIds={favoriteIds}
                  onToggleFavorite={handleToggleFavorite}
                  onSaveShortlist={handleSaveShortlist}
                  firstFocusRef={firstChooserBtnRef}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Constellation lens */}
      {lens === 'constellation' && (
        <div id="lens-panel-constellation" role="tabpanel" aria-labelledby="tab-constellation">
          <ConstellationCanvas
            active
            party={[]}
          />
          <ConstellationController
            active
            party={[]}
          />
        </div>
      )}

      {/* Temporal lens */}
      {lens === 'temporal' && (
        <div id="lens-panel-temporal" role="tabpanel" aria-labelledby="tab-temporal" className="fixed top-20 left-1/2 -translate-x-1/2 z-[580] pointer-events-auto">
          <TemporalController map={map} pixiLayerRef={pixiRef} />
        </div>
      )}
    </>
  )
}