import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import SuggestionCard from './SuggestionCard'
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
    <div className="fixed inset-x-0 bottom-24 z-[60] pointer-events-none">
      <Card className="mx-auto max-w-[640px] bg-background/80 backdrop-blur
                       shadow-xl pointer-events-auto">
        <CardHeader className="pt-2 pb-1">
          <CardTitle className="text-sm flex items-center gap-1">
            Friends Nearby <span className="font-normal">({suggestions.length})</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-2 px-3">
          <ScrollArea>
            <div className="flex gap-3">
              {suggestions.map((s, i) => {
                const key = s.friend_id ?? `${s.vibe_tag}-${s.distance_m}-${i}`;
                return <SuggestionCard key={key} suggestion={s} />;
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}