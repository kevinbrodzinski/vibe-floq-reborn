import { useUserLocation } from '@/hooks/useUserLocation'
import { useNearbyPeople } from '@/hooks/useNearbyPeople'
import { FriendCard } from './FriendCard'

export const FriendCarousel: React.FC = () => {
  const { pos } = useUserLocation()
  const { people, loading } = useNearbyPeople(pos?.lat, pos?.lng)

  if (loading || !people.length) return null

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-screen-sm z-[60]
                    flex gap-2 overflow-x-auto snap-x px-4 py-2
                    rounded-xl bg-background/90 backdrop-blur-sm shadow-lg">
      {people.map((person, index) => (
        <FriendCard key={person.profile_id || `nearby-${index}`} person={person} />
      ))}
    </div>
  )
}