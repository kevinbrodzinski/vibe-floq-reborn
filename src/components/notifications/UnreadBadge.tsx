import React from 'react'
import { useUnreadCount } from '@/lib/notifications/useUnreadCount'

export function UnreadBadge({ className = '' }: { className?: string }) {
  const { count, loading } = useUnreadCount()

  if (loading) {
    return <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 ${className}`}>…</span>
  }
  if (count <= 0) return null

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold ${className}`}
      aria-label={`${count} unread notifications`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}