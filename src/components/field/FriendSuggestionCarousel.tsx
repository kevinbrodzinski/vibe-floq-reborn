
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import SuggestionCard from './SuggestionCard'  // default import
import { useUserLocation } from '@/hooks/useUserLocation'
import { useSocialSuggestions } from '@/hooks/useSocialSuggestions'

export default function FriendSuggestionCarousel() {
  const { pos } = useUserLocation()
  const { suggestions, loading } = useSocialSuggestions(pos?.lat, pos?.lng)

  if (loading) {
    return (
      <div className="fixed inset-x-0 bottom-24 z-[60] flex
                      justify-center pointer-events-none">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!suggestions.length) return null

  return (
    <div className="fixed inset-x-0 bottom-[72px] z-[60] pointer-events-none">
      <ScrollArea className="pointer-events-auto">
        <div className="flex gap-3 pl-4 pr-6 py-2 pointer-events-auto">
          {suggestions.map((s, i) => {
            const key = s.friend_id ?? `${s.vibe_tag}-${s.distance_m}-${i}`;
            return <SuggestionCard key={key} suggestion={s} />;
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
