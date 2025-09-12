import * as React from 'react'
import { type RallyInboxItem } from '@/lib/api/rallyInbox'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/utils'

function relTime(iso:string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.max(0, Math.round(ms/60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m/60)
  return `${h}h ago`
}

export type RallyInboxDrawerProps = {
  open: boolean
  items: RallyInboxItem[]
  loading?: boolean
  error?: string|null
  onClose: () => void
  onJoin: (id:string)=>void
  onDecline: (id:string)=>void
  onViewMap: (itm: RallyInboxItem)=>void
  className?: string
}

export function RallyInboxDrawer({
  open, items, loading, error, onClose, onJoin, onDecline, onViewMap, className
}: RallyInboxDrawerProps) {
  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-label="Rally inbox"
         className={cn('fixed inset-0 z-[700] flex items-end sm:items-center justify-center', className)}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
        <header className="flex items-center gap-2 p-3 border-b border-border bg-card/60 backdrop-blur">
          <div className="text-base font-semibold">Rally Inbox</div>
          <div className="ml-auto" />
          <IconButton label="Close" onClick={onClose}>✖️</IconButton>
        </header>

        <div className="p-3 overflow-y-auto">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {error && <div className="text-sm text-destructive">Error: {error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="text-sm text-muted-foreground">No rally invites right now.</div>
          )}

          <ul className="space-y-2">
            {items.map(itm => {
              const expired = itm.expires_at && new Date(itm.expires_at).getTime() <= Date.now()
              const status = expired ? 'Expired'
                           : itm.invite_status === 'joined' ? 'Joined'
                           : itm.invite_status === 'declined' ? 'Declined'
                           : 'Pending'
              return (
                <li key={itm.rally_id} className="rounded-lg border border-border bg-card/60 backdrop-blur p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-foreground/10 overflow-hidden flex items-center justify-center text-xs">
                      {itm.creator_avatar
                        ? <img src={itm.creator_avatar} alt="" className="w-full h-full object-cover" />
                        : <span aria-hidden>⚡</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {itm.creator_name ?? 'Friend'} started a Rally
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {relTime(itm.created_at)} • {status} • {itm.joined_count} joined
                      </div>
                      
                      {/* Rally context chips */}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {/* People count */}
                        {Array.isArray((itm as any).participants) && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-foreground/5">
                            👥 {(itm as any).participants.length}
                          </span>
                        )}
                        {/* Distance / venue if available */}
                        {(itm as any).metadata?.venue_name && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-foreground/5">
                            📍 {(itm as any).metadata.venue_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <IconButton label="View on map" variant="soft" size="sm" onClick={() => onViewMap(itm)}>🗺️</IconButton>
                      {itm.invite_status !== 'joined' && !expired && (
                        <IconButton label="Join rally" variant="solid" size="sm" onClick={() => onJoin(itm.rally_id)}>✔️</IconButton>
                      )}
                      {itm.invite_status === 'pending' && (
                        <IconButton label="Decline" variant="soft" size="sm" onClick={() => onDecline(itm.rally_id)}>✖️</IconButton>
                      )}
                    </div>
                  </div>

                  {itm.note && (
                    <div className="mt-2 text-sm text-foreground/90">
                      "{itm.note}"
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}