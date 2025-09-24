import React from 'react'
import { useFriendDetection } from '@/hooks/useFriendDetection'
import type { FriendProfile } from '@/hooks/useFriendDetection'
import { FriendSuggestionCard } from './FriendSuggestionCard'

export function FriendSuggestionsContainer({
  lat,
  lng,
  radiusM = 500,
}: { lat: number; lng: number; radiusM?: number }) {
  const { data, isLoading, error } = useFriendDetection(lat, lng, radiusM)

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading suggestions...</div>
  }
  if (error) {
    return <div className="p-4 text-sm text-destructive">Failed to load friend suggestions</div>
  }

  const nearbyFriends: FriendProfile[] = data?.nearbyFriends ?? []

  if (nearbyFriends.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No friend suggestions right now</div>
  }

  return (
    <div className="grid gap-3">
      {nearbyFriends.map((f) => (
        <FriendSuggestionCard
          key={f.id}
          profile={f}
          onConnect={() => {/* wire later */}}
          onDismiss={() => {/* wire later */}}
        />
      ))}
    </div>
  )
}
