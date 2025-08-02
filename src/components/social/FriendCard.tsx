import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { NearbyRow } from '@/hooks/useNearbyPeople'

interface FriendCardProps {
  person: NearbyRow
}

export const FriendCard: React.FC<FriendCardProps> = ({ person }) => {
  const { profile_id, vibe, meters } = person

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

  // Generate display name based on available identifiers
  const displayName = profile_id ? `User ${profile_id.slice(-4)}` : 'Anonymous'

  return (
    <article className="w-36 shrink-0 snap-start px-2" tabIndex={0}>
      <div className="flex flex-col items-center space-y-2">
        <Avatar className="w-12 h-12">
          <AvatarImage src={`/placeholder.svg`} />
          <AvatarFallback className="text-xs bg-primary/20">
            {profile_id ? profile_id.slice(0, 2).toUpperCase() : vibe.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-center">
          <p className="text-sm font-medium truncate">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistance(meters)}
          </p>
        </div>

        <Badge variant={vibeColor(vibe)} className="text-xs">
          {vibe}
        </Badge>
      </div>
    </article>
  )
}