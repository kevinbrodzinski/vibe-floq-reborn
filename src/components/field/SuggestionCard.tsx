import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions'

// Null-safe distance formatter
const formatDistance = (m?: number | null) =>
  !Number.isFinite(m)
    ? '—'
    : m! < 1000
        ? `${m} m`
        : `${(m! / 1000).toFixed(1)} km`;

export default function SuggestionCard({ suggestion }: { suggestion: SocialSuggestion }) {
  const { display_name, vibe_tag, distance_m, avatar_url } = suggestion

  return (
    <Card className="w-[108px] shrink-0 rounded-xl p-2 text-center bg-muted/60
                     hover:bg-muted/70 transition pointer-events-auto">
      <Avatar className="h-10 w-10 mx-auto mb-1">
        <AvatarImage src={avatar_url ?? undefined} />
        <AvatarFallback className="text-xs font-semibold">
          {display_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="text-xs font-medium truncate">
        {display_name}
      </div>

      <div className="text-[11px] text-muted-foreground">
        {formatDistance(distance_m)}
      </div>

      {vibe_tag && (
        <Badge
          variant="secondary"
          className="mt-1 px-1.5 py-0 text-[10px] lowercase tracking-wide">
          {vibe_tag}
        </Badge>
      )}
    </Card>
  )
}