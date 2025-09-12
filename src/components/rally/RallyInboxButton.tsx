import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { useRallyUnread } from '@/hooks/useRallyUnread'
import { RallyUnreadBadge } from '@/components/rally/RallyUnreadBadge'

export function RallyInboxButton({ onOpen }: { onOpen: () => void }) {
  const { count, loading } = useRallyUnread()

  return (
    <div className="relative">
      <IconButton label="Open rally inbox" onClick={onOpen} variant="soft">
        📨
      </IconButton>
      <div className="pointer-events-none absolute -right-1 -top-1">
        {!loading && (
          <RallyUnreadBadge 
            count={count} 
            aria-label="Rally inbox unread"
            className="min-w-[18px] h-[18px] text-[11px] leading-[18px]"
          />
        )}
      </div>
    </div>
  )
}