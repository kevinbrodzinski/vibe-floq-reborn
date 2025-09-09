import React, { useRef } from 'react'
import { useFieldData } from '@/components/screens/field/FieldDataProvider'
import { useFieldLens } from '@/components/field/FieldLensProvider'
import { ExploreDrawer } from '@/components/field/ExploreDrawer'
import { ConstellationCanvas } from '@/components/overlays/ConstellationCanvas'
import { ConstellationController } from '@/components/overlays/ConstellationController'
import { TemporalController } from '@/components/Temporal/TemporalController'
import type { PixiLayerHandle } from '@/components/screens/field/AtmosphereLayer'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { VenueChooserPanel } from '@/components/venue/VenueChooserPanel'
import { listVenueFavorites, toggleVenueFavorite } from '@/lib/api/venueFavorites'
import { createShortlist } from '@/lib/api/venueShortlists'
import { useToast } from '@/hooks/use-toast'

export function FieldUILayer() {
  const data = useFieldData()
  const { lens } = useFieldLens()
  const pixiRef = useRef<PixiLayerHandle>(null)
  const map = getCurrentMap()
  const { toast } = useToast()

  // Chooser and favorites state
  const [chooserOpen, setChooserOpen] = React.useState(false)
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set())
  const [chooserAnchorPid, setChooserAnchorPid] = React.useState<string | null>(null)

  // Load favorites once (or when auth changes)
  React.useEffect(() => {
    let mounted = true
    listVenueFavorites().then(set => mounted && setFavoriteIds(set)).catch(()=>{})
    return () => { mounted = false }
  }, [])

  // Toggle favorite with optimistic UI
  const handleToggleFavorite = React.useCallback(async (venueId: string, next: boolean) => {
    setFavoriteIds(prev => {
      const n = new Set(prev); next ? n.add(venueId) : n.delete(venueId); return n
    })
    try { 
      await toggleVenueFavorite(venueId, next) 
    } catch {
      // revert
      setFavoriteIds(prev => {
        const n = new Set(prev); next ? n.delete(venueId) : n.add(venueId); return n
      })
      toast({ title: "Error", description: "Could not update favorite", variant: "destructive" })
    }
  }, [toast])

  const handleSaveShortlist = React.useCallback(async (name: string, venueIds: string[]) => {
    try {
      await createShortlist(name, venueIds)
      toast({ title: "Success", description: "Shortlist saved" })
    } catch {
      toast({ title: "Error", description: "Failed to save shortlist", variant: "destructive" })
    }
  }, [toast])

  return (
    <>
      {/* Explore lens */}
      {lens === 'explore' && (data.nearbyVenues?.length ?? 0) > 0 && (
        <>
          <ExploreDrawer
            venues={data.nearbyVenues!}
            onJoin={(pid) => { /* TODO: hook join flow */ }}
            onSave={(pid) => { handleToggleFavorite(pid, true) }}
            onPlan={(pid) => { /* TODO: planning flow */ }}
            onChangeVenue={(pid) => {
              setChooserAnchorPid(pid)
              setChooserOpen(true)
            }}
          />

          {/* Inline Venue Chooser Panel */}
          {chooserOpen && (
            <div className="fixed left-0 right-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[610] flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-[520px] px-4">
                <VenueChooserPanel
                  option={{
                    // a minimal InviteOption-like shell just to satisfy the panel
                    kind: 'planned' as any,
                    text: 'Pick a venue',
                    score: 0.5,
                    friction: 'low' as any,
                    successProb: 0.6,
                    rationale: ['Personalized picks'],
                    payload: chooserAnchorPid ? { venueId: chooserAnchorPid } : {}
                  }}
                  venues={data.nearbyVenues!.map(v => ({
                    id: v.pid,
                    name: v.name,
                    loc: { lng: 0, lat: 0 },                 // fill if you have lng/lat
                    vibeTags: v.category ? [v.category] : [],
                    openNow: !!v.open_now,
                    priceLevel: undefined,
                    popularityLive: v.busy_band != null ? v.busy_band/4 : undefined,
                    photoUrl: undefined             // fill if you have photos
                  }))}
                  focus={undefined}                 // pass centroid if available
                  excludeVenueId={(chooserAnchorPid ?? undefined) || null}
                  onSelect={(venue) => {
                    // You can rewrite drawer primary to selected venue here,
                    // or trigger a "navigate to venue detail" flow:
                    toast({ title: "Selected", description: `Selected ${venue.name}` })
                    setChooserOpen(false)
                  }}
                  onPreview={(venue) => {
                    toast({ title: "Preview", description: `Preview ${venue.name}` })
                    // optionally center map: centerMapOn(venue.loc)
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