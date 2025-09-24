import React from 'react'
import type { FriendProfile } from '@/hooks/useFriendDetection'

export type FriendSuggestionCardProps = {
  profile: FriendProfile
  onConnect: () => void
  onDismiss: () => void
}

export function FriendSuggestionCard({ profile, onConnect, onDismiss }: FriendSuggestionCardProps) {
  return (
    <div className="rounded-lg border p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={profile.avatar_url ?? ''} alt="" className="h-8 w-8 rounded-full object-cover" />
        <div>
          <div className="text-sm font-medium">{profile.display_name ?? profile.username ?? 'Friend'}</div>
          <div className="text-xs text-muted-foreground">{profile.distance_m ? `${Math.round(profile.distance_m)} m` : ''}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="px-2 py-1 text-xs border rounded" onClick={onDismiss}>Dismiss</button>
        <button className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded" onClick={onConnect}>Connect</button>
      </div>
    </div>
  )
}