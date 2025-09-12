
import * as React from 'react'
import { useFieldUI } from '@/components/field/contexts/FieldUIContext'
import { useFieldData } from './FieldDataProvider'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { useVibeNow } from '@/hooks/useVibeNow'
import { useToast } from '@/hooks/use-toast'
import { ExploreDrawerWithFlow } from '@/components/field/ExploreDrawerWithFlow'
import { useFlowRecorder } from '@/hooks/useFlowRecorder'
import { RecorderControlsFab } from '@/components/flow/RecorderControlsFab' // NEW
import { useExploreDrawer } from '@/contexts/ExploreDrawerContext'

type FieldSystemLayerProps = { data: any }

export const FieldSystemLayer = ({ data }: FieldSystemLayerProps) => {
  const { selectedVenueId } = useFieldUI()
  const map = getCurrentMap()
  const { currentVibe } = useVibeNow()
  const { toast } = useToast()
  const recorder = useFlowRecorder()

  const { isOpen: isExploreOpen, setOpen: setExploreOpen } = useExploreDrawer()

  const venues = data?.nearbyVenues ?? []

  const handleJoin = (pid: string) => toast({ title: 'Joined venue', description: pid })
  const handleSave = (pid: string) => toast({ title: 'Saved venue', description: pid })
  const handlePlan = (pid: string) => toast({ title: 'Plan created', description: pid })
  const handleChangeVenue = (_pid: string) => setExploreOpen(false)

  return (
    <>
      {venues.length > 0 && (
        <ExploreDrawerWithFlow
          venues={venues}
          onJoin={handleJoin}
          onSave={handleSave}
          onPlan={handlePlan}
          onChangeVenue={handleChangeVenue}
          isOpen={isExploreOpen}
          onOpenChange={setExploreOpen}
        />
      )}

      {/* FAB lives here; hidden while the drawer is open */}
      {!isExploreOpen && (
        <RecorderControlsFab className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[650]" />
      )}
    </>
  )
}
