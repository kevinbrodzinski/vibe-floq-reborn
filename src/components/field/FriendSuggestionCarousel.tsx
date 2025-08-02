import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import SuggestionCard from './SuggestionCard'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useSocialSuggestions } from '@/hooks/useSocialSuggestions'

export default function FriendSuggestionCarousel() {
  const { pos } = useUserLocation()
  const { suggestions, loading } = useSocialSuggestions(pos?.lat, pos?.lng)

  if (loading) return null         // or show skeleton
  if (!suggestions.length) return null

  return (
    <div className="pointer-events-auto">
      <h4 className="mb-2 text-sm font-medium">
        Friends Nearby <span className="text-muted-foreground">({suggestions.length})</span>
      </h4>

      <ScrollArea className="w-full whitespace-nowrap pb-1">
        <div className="flex gap-3">
          {suggestions.map(s => (
            <SuggestionCard key={s.friend_id} suggestion={s} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}