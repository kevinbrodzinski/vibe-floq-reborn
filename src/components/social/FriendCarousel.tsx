import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useNearbyPeople } from '@/hooks/useNearbyPeople'
import { FriendCard } from './FriendCard'
import { generateStableKey } from '@/utils/stableKeys'

export const FriendCarousel: React.FC = () => {
  const { pos } = useUserLocation()
  const { people, loading } = useNearbyPeople(pos?.lat, pos?.lng)
  const [open, setOpen] = useState(true)

  if (loading || !people.length) return null

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-[61] h-10 w-10 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
        aria-label={open ? 'Hide nearby people' : 'Show nearby people'}
      >
        {open ? <X className="h-5 w-5" /> : <Users className="h-5 w-5" />}
      </button>

      {open && (
        <div 
          className="fixed bottom-4 left-0 right-0 mx-auto max-w-screen-sm z-[60]
                     flex gap-2 overflow-x-auto snap-x snap-mandatory px-4 py-2
                     rounded-xl bg-background/90 backdrop-blur-sm shadow-lg"
          role="region"
          aria-label="Nearby people"
          tabIndex={0}
        >
          {people.map((person, index) => {
            // Generate stable key for React diffing with component-specific prefix
            const stableKey = generateStableKey(person, 'carousel', index)
            return <FriendCard key={stableKey} person={person} />
          })}
        </div>
      )}
    </>
  )
}