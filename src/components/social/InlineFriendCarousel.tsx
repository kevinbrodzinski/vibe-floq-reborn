import { useState, memo } from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useNearbyPeople, type NearbyRow } from '@/hooks/useNearbyPeople'
import { FriendCard } from './FriendCard'
import { SocialInteractionModal } from './SocialInteractionModal'
import { generateStableKey } from '@/utils/stableKeys'

export const InlineFriendCarousel = memo(() => {
  const { pos } = useUserLocation()
  const { people, loading } = useNearbyPeople(pos?.lat, pos?.lng, 12)
  const [selected, setSelected] = useState<NearbyRow | null>(null)

  if (loading || people.length === 0) return null

  return (
    <section aria-label="Nearby people" className="my-4 px-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium text-foreground">Nearby people</h3>
        <span className="text-xs text-muted-foreground">{people.length}</span>
      </div>

      <div
        className="
          flex gap-2 overflow-x-auto snap-x snap-mandatory
          rounded-xl border border-border/40 bg-card/60 backdrop-blur
          px-3 py-2
        "
      >
        {people.map((p, i) => (
          <FriendCard
            key={generateStableKey(p, 'inline-carousel', i)}
            person={p}
            onClick={() => setSelected(p)}
          />
        ))}
      </div>

      <SocialInteractionModal
        open={!!selected}
        onOpenChange={state => !state && setSelected(null)}
        person={selected}
      />
    </section>
  )
})