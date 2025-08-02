import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, MapPin } from 'lucide-react'
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions'

interface SuggestionCardProps {
  suggestion: SocialSuggestion
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const { friend_id, display_name, avatar_url, vibe_tag, distance_m, last_activity } = suggestion

  const vibeColor = (vibe: string) => {
    switch (vibe.toLowerCase()) {
      case 'energetic': return 'destructive'
      case 'excited': return 'default'
      case 'social': return 'secondary'
      case 'chill': return 'outline'
      case 'focused': return 'outline'
      default: return 'outline'
    }
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  return (
    <article className="w-36 shrink-0 snap-start px-2" tabIndex={0}>
      <div className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-card border shadow-sm">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatar_url || '/placeholder.svg'} />
          <AvatarFallback className="text-xs bg-primary/20">
            {display_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <p className="text-sm font-medium truncate">
            {display_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistance(distance_m)}
          </p>
          <p className="text-xs text-muted-foreground">
            {last_activity}
          </p>
        </div>

        <Badge variant={vibeColor(vibe_tag)} className="text-xs">
          {vibe_tag}
        </Badge>

        <div className="flex gap-1 w-full">
          <Button size="sm" variant="ghost" className="flex-1 h-8">
            <MapPin className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 h-8">
            <MessageCircle className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </article>
  )
}