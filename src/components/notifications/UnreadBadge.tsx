import React from 'react'
import { useUnreadCount } from '@/lib/notifications/useUnreadCount'
import { cn } from '@/lib/utils'

export function UnreadBadge({ 
  className,
  'aria-label': ariaLabel
}: { 
  className?: string
  'aria-label'?: string 
}) {
  const { count, loading } = useUnreadCount()

  if (loading) {
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20',
          className
        )}
        aria-label="Loading notifications..."
      >
        …
      </span>
    )
  }

  if (!count || count <= 0) return null

  const display = count > 99 ? '99+' : String(count)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'min-w-[1.25rem] h-5 px-1.5 text-[11px] font-semibold',
        'bg-destructive text-destructive-foreground shadow-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? `${display} unread notifications`}
      title={`${display} unread notifications`}
    >
      {display}
    </span>
  )
}