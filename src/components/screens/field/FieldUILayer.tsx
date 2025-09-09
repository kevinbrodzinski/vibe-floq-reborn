import React, { useRef } from 'react'
import { useFieldData } from '@/components/screens/field/FieldDataProvider'
import { useFieldLens } from '@/components/field/FieldLensProvider'
import { ExploreDrawer } from '@/components/field/ExploreDrawer'
import { ConstellationCanvas } from '@/components/overlays/ConstellationCanvas'
import { ConstellationController } from '@/components/overlays/ConstellationController'
import { TemporalController } from '@/components/Temporal/TemporalController'
import type { PixiLayerHandle } from '@/components/screens/field/AtmosphereLayer'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

// NEW imports
import { VenueChooserPanel } from '@/components/venue/VenueChooserPanel'
import { listVenueFavorites, toggleVenueFavorite } from '@/lib/api/venueFavorites'
import { createShortlist } from '@/lib/api/venueShortlists'
import { useToast } from '@/hooks/use-toast'

export function FieldUILayer() {
  const data = useFieldData()
  const { lens } = useFieldLens()
  const pixiRef = useRef<PixiLayerHandle>(null)
  const map = getCurrentMap()

  // --- Chooser state (NEW) ---
  const { toast } = useToast()
  const success = (message: string) => toast({ title: "Success", description: message })
  const toastError = (message: string) => toast({ title: "Error", description: message, variant: "destructive" })
  const info = (message: string, duration?: number) => toast({ title: "Info", description: message })
  const [chooserOpen, setChooserOpen] = React.useState(false)
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set())
  const [chooserAnchorPid, setChooserAnchorPid] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    listVenueFavorites().then(set => mounted && setFavoriteIds(set)).catch(()=>{})
    return () => { mounted = false }
  }, [])

  const handleToggleFavorite = React.useCallback(async (venueId: string, next: boolean) => {
    setFavoriteIds(prev => { const n = new Set(prev); next ? n.add(venueId) : n.delete(venueId); return n })
    try { await toggleVenueFavorite(venueId, next) }
    catch {
      // revert on failure
      setFavoriteIds(prev => { const n = new Set(prev); next ? n.delete(venueId) : n.add(venueId); return n })
      toastError('Could not update favorite')
    }
  }, [toastError])

  const handleSaveShortlist = React.useCallback(async (name: string, venueIds: string[]) => {
    try { await createShortlist(name, venueIds); success('Shortlist saved') }
    catch { toastError('Failed to save shortlist') }
  }, [success, toastError])

  // --- Lens UI ---
  return (
    <>
      {/* Explore lens */}
      {lens === 'explore' && (data.nearbyVenues?.length ?? 0) > 0 && (
        <>
          <ExploreDrawer
            venues={data.nearbyVenues!}
            onJoin={(pid) => { /* TODO: join flow */ }}
            onSave={(pid) => { /* TODO: favorites flow */ }}
            onPlan={(pid) => { /* TODO: planning flow */ }}
            onChangeVenue={(pid) => {
              setChooserAnchorPid(pid)
              setChooserOpen(true)
            }}
          />

          {/* Venue chooser overlay (inline) */}
          {chooserOpen && (
            <div className="fixed left-0 right-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[610] flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[520px] px-4">
                <VenueChooserPanel
                  option={{
                    // Minimal InviteOption-like shell for the panel
                    kind: 'planned' as any,
                    text: 'Pick a venue',
                    score: 0.5,
                    friction: 'low',
                    successProb: 0.6,
                    rationale: ['Personalized picks'],
                    payload: chooserAnchorPid ? { venueId: chooserAnchorPid } : {}
                  }}
                  venues={data.nearbyVenues!.map(v => ({
                    id: v.pid,
                    name: v.name,
                    loc: undefined, // fill if you have lng/lat
                    vibeTags: v.category ? [v.category] : [],
                    openNow: !!v.open_now,
                    priceLevel: undefined,
                    popularityLive: v.busy_band != null ? v.busy_band/4 : undefined,
                    photoUrl: undefined
                  }))}
                  focus={undefined} // pass centroid if you track viewport center
                  excludeVenueId={(chooserAnchorPid ?? undefined) || null}
                  onSelect={(venue) => {
                    success(`Selected ${venue.name}`)
                    // OPTIONAL: update the drawer's primary to this venue
                    setChooserOpen(false)
                  }}
                  onPreview={(venue) => {
                    info(`Preview ${venue.name}`, 1200)
                    // OPTIONAL: center map on venue.loc; if you have loc, call map.flyTo(...)
                  }}
                  onClose={() => setChooserOpen(false)}
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