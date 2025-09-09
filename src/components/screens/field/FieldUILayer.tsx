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
  const firstFocusRef = useRef<HTMLButtonElement>(null)
  
  // Memoized venue mapping for performance
  const venueLite = useMemo(() => {
    return data.nearbyVenues?.map(mapTileToLite) ?? []
  }, [data.nearbyVenues])

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
  }, [])

  // Focus management - focus first button when chooser opens
  React.useEffect(() => {
    if (chooserOpen) {
      const timer = setTimeout(() => {
        // Find first focusable element in the chooser panel
        const chooserEl = document.querySelector('[data-testid="venue-chooser-panel"]') || 
                          document.querySelector('.pointer-events-auto button')
        const focusable = chooserEl?.querySelector('button, [tabindex]:not([tabindex="-1"])')
        ;(focusable as HTMLElement)?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [chooserOpen])

  return (
    <>
      {/* Explore lens */}
      {lens === 'explore' && (data.nearbyVenues?.length ?? 0) > 0 && (
        <>
          <ExploreDrawer
            venues={data.nearbyVenues!}
            onJoin={(pid) => { /* TODO: join flow */ }}
            onSave={(pid) => { handleToggleFavorite(pid, true) }}
            onPlan={(pid) => { /* TODO: planning flow */ }}
            onChangeVenue={handleChangeVenue}
          />

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
                    setChooserOpen(false)
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
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Constellation lens */}
      {lens === 'constellation' && (
        <>
          <ConstellationCanvas
            active
            party={[]}
          />
          <ConstellationController
            active
            party={[]}
          />
        </>
      )}

      {/* Temporal lens */}
      {lens === 'temporal' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[580] pointer-events-auto">
          <TemporalController map={map} pixiLayerRef={pixiRef} />
        </div>
      )}
    </>
  )
}