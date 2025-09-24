import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { useRallyInbox } from '@/hooks/useRallyInbox'
import { RallyUnreadBadge } from '@/components/rally/RallyUnreadBadge'

export function RallyInboxButton({ onOpen }: { onOpen: () => void }) {
  const { unreadCount, loading } = useRallyInbox()

  return (
    <div className="relative">
      <IconButton
        label="Open rally inbox"
        onClick={onOpen}
        variant="soft"
        aria-busy={loading || undefined}
      >
        📨
      </IconButton>
      <div className="pointer-events-none absolute -right-1 -top-1">
        {!loading && (
          <RallyUnreadBadge 
            count={unreadCount} 
            aria-label="Rally inbox unread"
            className="min-w-[18px] h-[18px] text-[11px] leading-[18px]"
          />
        )}
      </div>
    </div>
  )
}