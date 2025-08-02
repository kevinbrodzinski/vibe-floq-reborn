import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { formatDistance } from '@/utils/formatDistance'
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions'

export default function SuggestionCard({ suggestion }: { suggestion: SocialSuggestion }) {
  const { display_name, vibe_tag, distance_m, avatar_url } = suggestion

  return (
    <Card className="min-w-[136px] rounded-xl bg-muted/60 hover:bg-muted/70 transition
                     p-3 text-center">
      <Avatar className="h-10 w-10 mx-auto mb-2">
        <AvatarImage src={avatar_url ?? undefined} />
        <AvatarFallback className="bg-background/60 text-sm font-semibold">
          {display_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <p className="text-xs font-medium truncate">{display_name}</p>
      <p className="text-[11px] text-muted-foreground">{formatDistance(distance_m)}</p>

      <Badge variant="secondary" className="mt-1 text-[10px] lowercase">
        {vibe_tag}
      </Badge>
    </Card>
  )
}