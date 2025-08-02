import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { formatDistance } from '@/utils/formatDistance'
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions'

export default function SuggestionCard({ suggestion }: { suggestion: SocialSuggestion }) {
  const { display_name, vibe_tag, distance_m, avatar_url } = suggestion

  return (
    <Card className="min-w-[136px] px-3 py-3 rounded-2xl bg-background/60 backdrop-blur-sm shadow-md">
      <Avatar className="h-10 w-10 mx-auto mb-2">
        <AvatarImage src={avatar_url ?? undefined} />
        <AvatarFallback className="text-[10px] font-semibold">
          {display_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <p className="text-xs font-medium truncate">{display_name}</p>
      <p className="text-xs text-muted-foreground">{formatDistance(distance_m)}</p>

      {vibe_tag && (
        <Badge variant="secondary" className="mt-1 text-[10px]">
          {vibe_tag}
        </Badge>
      )}
    </Card>
  )
}