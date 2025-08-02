import { useUserLocation } from '@/hooks/useUserLocation'
import { useNearbyPeople } from '@/hooks/useNearbyPeople'
import { FriendCard } from './FriendCard'
import { generateStableKey } from '@/utils/stableKeys'

export const InlineFriendCarousel: React.FC = () => {
  const { pos } = useUserLocation()
  const { people, loading } = useNearbyPeople(pos?.lat, pos?.lng)

  if (loading || !people.length) return null

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">Nearby People</h3>
        <p className="text-xs text-muted-foreground">{people.length} people around you</p>
      </div>
      
      <div 
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2
                   bg-card/50 border rounded-lg p-3"
        role="region"
        aria-label="Nearby people carousel"
        tabIndex={0}
      >
        {people.map((person, index) => {
          const stableKey = generateStableKey(person, 'inline-carousel', index)
          return <FriendCard key={stableKey} person={person} />
        })}
      </div>
    </div>
  )
}