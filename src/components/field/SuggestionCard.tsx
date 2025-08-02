import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions'

export default function SuggestionCard({ suggestion }: { suggestion: SocialSuggestion }) {
  const { display_name, vibe_tag, distance_m } = suggestion

  return (
    <Card className="min-w-[140px] p-3 text-center">
      <div className="mb-2 h-10 w-10 rounded-full bg-muted mx-auto flex items-center justify-center">
        <span className="font-semibold text-sm">
          {display_name.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <p className="text-xs font-medium truncate">{display_name}</p>
      <p className="text-xs text-muted-foreground">{(distance_m / 1000).toFixed(1)} km</p>

      <Badge variant="secondary" className="mt-1 text-[10px]">{vibe_tag}</Badge>
    </Card>
  )
}