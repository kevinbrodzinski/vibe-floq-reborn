import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'

export function RallyInboxButton({ count=0, onOpen }: { count?: number; onOpen: () => void }) {
  return (
    <div className="relative">
      <IconButton label="Open rally inbox" onClick={onOpen} variant="soft">
        📨
      </IconButton>
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground
                     text-[11px] leading-[18px] text-center font-semibold"
          aria-label={`${count} new rally invite${count>1?'s':''}`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )
}