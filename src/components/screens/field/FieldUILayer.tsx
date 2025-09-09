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
import { useFlowFilters } from '@/hooks/useFlowFilters'
import { useFlowExplore } from '@/hooks/useFlowExplore'
import { useSunOpportunity } from '@/hooks/useSunOpportunity'
import { FlowErrorBoundary } from '@/components/flow/FlowErrorBoundary'
import { FlowDebugBadge } from '@/components/flow/FlowDebugBadge'

// Flow recording imports
import { useFlowSampler } from '@/hooks/flow/useFlowSampler'
import { useFlowRecorder } from '@/hooks/useFlowRecorder'
import { FlowRecorderFAB } from '@/components/flow/FlowRecorderFAB'
import { FlowHUD } from '@/components/flow/FlowHUD'
import ConvergenceCard from '@/components/flow/ConvergenceCard'
import { pingFriends } from '@/lib/api/flow'

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

  // Flow recording state
  const { state: samplerState, begin, pause: pauseSampler, resume: resumeSampler, stop: stopSampler } = useFlowSampler({
    minDistanceM: 35, 
    maxIntervalMs: 30_000,
  })
  const { sui01, elapsedMin } = useFlowRecorder()
  const [convCard, setConvCard] = React.useState<{
    lng: number; lat: number; groupMin: number; prob: number; etaMin: number;
  } | null>(null)

  // Flow state for explore lens - now managed by hooks  
  const { filters, setFilters, loaded: filtersLoaded } = useFlowFilters()
  const sunEnabled = filters.weatherPref?.[0] === 'sun'
  const { score: sunScore } = useSunOpportunity(lens === 'explore' && sunEnabled)
  const [lastMs, setLastMs] = React.useState<number|undefined>()
  const { venues, convergence, clusterRes, loading, error } =
    useFlowExplore({ lens, map, filters, onLatencyMs: setLastMs })
  // Memoized venue mapping for performance
  const venueLite = useMemo(() => {
    return data.nearbyVenues?.map(mapTileToLite) ?? []
  }, [data.nearbyVenues])

  // Combined venues: prioritize Flow venues when available, fallback to static venues
  const displayVenues = useMemo(() => {
    return venues.length > 0 ? venues : data.nearbyVenues ?? []
  }, [venues, data.nearbyVenues])

  // Close convergence card when lens changes away from explore
  React.useEffect(() => {
    if (lens !== 'explore' && convCard) setConvCard(null)
  }, [lens, convCard])

  React.useEffect(() => {
    let mounted = true
    listVenueFavorites()
      .then(set => mounted && setFavoriteIds(set))
      .catch(()=>{})
    return () => { mounted = false }
  }, [])

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
      {lens === 'explore' && filtersLoaded && (
        <FlowErrorBoundary>
          <FlowExploreChips 
            value={filters} 
            onChange={setFilters} 
            clusterRes={clusterRes}
            loading={loading}
            sunScore={sunScore ?? undefined}
          />
        </FlowErrorBoundary>
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

          {/* Flow convergence overlay with tap handler */}
          <FlowMapOverlay 
            points={convergence}
            onPointTap={(p) => setConvCard(p)}   // opens card
          />

          {/* Flow recording FAB */}
          <FlowRecorderFAB
            state={samplerState}
            onStart={() => begin('owner')}
            onPause={pauseSampler}
            onResume={resumeSampler}
            onStop={stopSampler}
          />

          {/* Flow HUD */}
          {samplerState === 'recording' && (
            <FlowHUD elapsedMin={elapsedMin} sui01={sui01} />
          )}

          {/* Convergence card */}
          {convCard && (
            <ConvergenceCard
              point={convCard}
              onClose={() => setConvCard(null)}
              onInvite={async (p) => {
                try {
                  const { recipients } = await pingFriends(p, 'Join me here?')
                  toast({
                    title: 'Ping sent',
                    description: recipients.length
                      ? `Notified ${recipients.length} friends.`
                      : 'No friends found to ping (yet).',
                  })
                } catch (e:any) {
                  toast({ title: 'Ping failed', description: e.message ?? 'Please try again', variant: 'destructive' })
                } finally {
                  setConvCard(null)
                }
              }}
              onRoute={(p) => {
                setConvCard(null)
                map?.flyTo?.({ center: [p.lng, p.lat], zoom: 15 })
                toast({ title: 'Routing', description: 'Centering on convergence…' })
              }}
            />
          )}

          {/* Error display */}
          {error && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-destructive/90 text-destructive-foreground 
                          px-4 py-2 rounded-md text-sm backdrop-blur-sm z-[620]">
              {error}
            </div>
          )}

          {/* Dev HUD */}
          <FlowDebugBadge zoom={map?.getZoom?.() ?? 14} res={clusterRes} lastMs={lastMs} />

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