import React from 'react'
import { Bell, MessageCircle, UserPlus, Check, X } from 'lucide-react'

export const getNotificationIcon = (kind: string) => {
  const cls = 'w-4 h-4 text-white/80'
  switch (kind) {
    case 'ping': return <Bell className={cls} />
    case 'dm': return <MessageCircle className={cls} />
    case 'friend_request': return <UserPlus className={cls} />
    case 'friend_request_accepted': return <Check className={cls} />
    case 'friend_request_declined': return <X className={cls} />
    default: return <Bell className={cls} />
  }
}

export const getNotificationTitle = (n: any) => {
  switch (n.kind) {
    case 'ping': return 'Ping from a friend'
    case 'dm': return 'New Message'
    case 'friend_request': return 'New Friend Request'
    case 'friend_request_accepted': return 'Friend Request Accepted'
    case 'friend_request_declined': return 'Friend Request Declined'
    default: return 'New Notification'
  }
}

export const getNotificationSubtitle = (n: any) => {
  if (n.kind === 'ping') {
    const p = n.payload
    if (p?.point) return `ETA ~${p.point.etaMin}m • Prob ${Math.round((p.point.prob ?? 0) * 100)}%`
    if (p?.message) return p.message
    return 'New ping received'
  }
  return n.payload?.preview || ''
}