import { useState } from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useNearbyPeople } from '@/hooks/useNearbyPeople'
import { FriendCard } from './FriendCard'
import { SocialInteractionModal } from './SocialInteractionModal'
import { generateStableKey } from '@/utils/stableKeys'
import type { NearbyRow } from '@/hooks/useNearbyPeople'

export const InlineFriendCarousel: React.FC = () => {
  const { pos } = useUserLocation()
  const { people, loading } = useNearbyPeople(pos?.lat, pos?.lng)
  const [selectedPerson, setSelectedPerson] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  if (loading || !people.length) return null

  const transformToPerson = (nearbyPerson: NearbyRow) => ({
    id: nearbyPerson.profile_id || 'unknown',
    name: nearbyPerson.profile_id ? `User ${nearbyPerson.profile_id.slice(-4)}` : 'Anonymous',
    vibe: nearbyPerson.vibe,
    color: getVibeColor(nearbyPerson.vibe),
    isFriend: false // TODO: Add friend status check
  })

  const getVibeColor = (vibe: string) => {
    switch (vibe.toLowerCase()) {
      case 'energetic': return '#ef4444'
      case 'excited': return '#f97316' 
      case 'social': return '#10b981'
      case 'chill': return '#6366f1'
      case 'focused': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  const handlePersonClick = (person: NearbyRow) => {
    setSelectedPerson(transformToPerson(person))
    setModalOpen(true)
  }

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
          return (
            <FriendCard 
              key={stableKey} 
              person={person} 
              onClick={() => handlePersonClick(person)}
            />
          )
        })}
      </div>

      <SocialInteractionModal
        person={selectedPerson}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}