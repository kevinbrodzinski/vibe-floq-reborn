import { useFriendDrawer } from '@/contexts/FriendDrawerContext'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useNearbyPeople } from '@/hooks/useNearbyPeople'
import { FriendCard } from '@/components/social/FriendCard'
import { Loader2 } from 'lucide-react'

export const FriendDrawer = () => {
  const { open } = useFriendDrawer()
  const { pos } = useUserLocation()
  const { people, loading } = useNearbyPeople(pos?.lat, pos?.lng, 12)

  return (
    <div
      id="friend-drawer"
      className={`
        fixed inset-x-0 bottom-0 mx-auto max-w-screen-sm z-[60]
        px-4 pb-4 transition-transform duration-300 ease-out
        ${open ? 'translate-y-0' : 'translate-y-[110%]'}
      `}>
      <div className="
          flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 py-3
          rounded-xl bg-background/90 backdrop-blur-sm shadow-lg border border-border
        ">
        {loading ? (
          <div className="flex items-center justify-center w-full py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Finding nearby friends...</span>
          </div>
        ) : people.length === 0 ? (
          <div className="flex items-center justify-center w-full py-4">
            <span className="text-sm text-muted-foreground">No friends nearby</span>
          </div>
        ) : (
          people.map((p, i) => {
            const stableKey = p.profile_id || `anon-${p.vibe}-${p.meters}-${i}`
            return <FriendCard key={stableKey} person={p} />
          })
        )}
      </div>
    </div>
  )
}