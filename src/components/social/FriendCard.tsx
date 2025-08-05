import { memo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import type { NearbyRow } from '@/hooks/useNearbyPeople'

interface FriendCardProps {
  person: NearbyRow
  onClick?: (person: NearbyRow) => void
}

export const FriendCard = memo(({ person, onClick }: FriendCardProps) => {
  const { profile_id, vibe, meters } = person
  const { socialHaptics } = useHapticFeedback()

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

  const handleClick = () => {
    socialHaptics.avatarInteraction()
    onClick?.(person)
  }

  return (
    <button
      onClick={handleClick}
      className="
        snap-start shrink-0 w-[116px] p-3 rounded-xl border
        bg-card/70 hover:bg-card transition-colors text-center
        focus-visible:ring-2 focus-visible:ring-primary/30
      "
      aria-label={`View ${displayName} profile`}
    >
      <Avatar className="h-10 w-10 mx-auto mb-2">
        <AvatarImage src={`/placeholder.svg`} />
        <AvatarFallback className="text-[10px] font-semibold bg-primary/20">
          {profile_id ? profile_id.slice(0, 2).toUpperCase() : vibe.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <p className="text-xs font-medium truncate mb-0.5">
        {displayName}
      </p>
      <p className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistance(meters)}
      </p>

      <Badge variant={vibeColor(vibe)} className="text-xs mt-1">
        {vibe}
      </Badge>
    </button>
  )
})