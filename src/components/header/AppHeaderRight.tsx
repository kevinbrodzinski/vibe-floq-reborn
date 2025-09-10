import React from 'react'
import { useUnreadCount } from '@/lib/notifications/useUnreadCount'
import { UnreadBadge } from '@/components/notifications/UnreadBadge'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppHeaderRight({ className }: { className?: string }) {
  const { count } = useUnreadCount()
  const nav = useNavigate()

  return (
    <button
      onClick={() => nav('/notifications')}
      className={cn('relative inline-flex items-center gap-2 p-2 rounded-md hover:bg-white/5', className)}
      aria-label="Open notifications"
    >
      <Bell className="w-5 h-5 text-white/90" />
      {count > 0 && (
        <UnreadBadge 
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-xs flex items-center justify-center px-1"
          aria-label={`${count} unread notifications`}
        >
          {count > 99 ? '99+' : count}
        </UnreadBadge>
      )}
    </button>
  )
}