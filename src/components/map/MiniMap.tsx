import { FieldVisualization } from '@/components/screens/field/FieldVisualization'
import { useFullscreenMap } from '@/store/useFullscreenMap'

export const MiniMap = ({
  constellationMode,
  people,
  friends,
  floqEvents,
  walkableFloqs,
  onFriendInteraction,
  onConstellationGesture,
  onAvatarInteraction
}: any) => {
  const { toggleList } = useFullscreenMap()

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 h-[96px] w-[calc(100%-2rem)]
                 overflow-hidden rounded-xl shadow-lg ring-1 ring-border cursor-pointer
                 hover:ring-2 hover:ring-primary/20 transition-all"
      onClick={toggleList}
    >
      <FieldVisualization
        mini={true}
        constellationMode={constellationMode}
        people={people}
        friends={friends}
        floqEvents={floqEvents}
        walkableFloqs={walkableFloqs}
        onFriendInteraction={onFriendInteraction}
        onConstellationGesture={onConstellationGesture}
        onAvatarInteraction={onAvatarInteraction}
      />
    </div>
  )
}