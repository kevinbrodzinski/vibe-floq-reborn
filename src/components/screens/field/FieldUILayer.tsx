import React, { useRef } from 'react'
import { useFieldData } from '@/components/screens/field/FieldDataProvider'
import { useFieldLens } from '@/components/field/FieldLensProvider'
import { ExploreDrawer } from '@/components/field/ExploreDrawer'
import { ConstellationCanvas } from '@/components/overlays/ConstellationCanvas'
import { ConstellationController } from '@/components/overlays/ConstellationController'
import { TemporalController } from '@/components/Temporal/TemporalController'
import type { PixiLayerHandle } from '@/components/screens/field/AtmosphereLayer'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

export function FieldUILayer() {
  const data = useFieldData()
  const { lens } = useFieldLens()
  const pixiRef = useRef<PixiLayerHandle>(null)
  const map = getCurrentMap()

  return (
    <>
      {/* Explore lens */}
      {lens === 'explore' && (data.nearbyVenues?.length ?? 0) > 0 && (
        <ExploreDrawer
          venues={data.nearbyVenues!}
          onJoin={(pid) => { /* TODO: hook join flow */ }}
          onSave={(pid) => { /* TODO: favorites flow */ }}
          onPlan={(pid) => { /* TODO: planning flow */ }}
          onChangeVenue={(pid) => { /* TODO: open VenueChooserPanel */ }}
        />
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