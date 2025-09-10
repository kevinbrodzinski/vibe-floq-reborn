import React from 'react'
import { useNotifications } from '@/lib/notifications/useNotifications'
import { useEventNotifications } from '@/providers/EventNotificationsProvider'
import { getNotificationIcon, getNotificationTitle, getNotificationSubtitle } from '@/components/notifications/formatters'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

export default function NotificationsPage() {
  const { toast } = useToast()
  // ping table (edge-backed) + event stream (existing)
  const {
    items: pingItems, loading, error, hasMore, refresh, loadMore, markRead, markAllReadUpTo
  } = useNotifications({ pageSize: 20 })
  const { unseen: events, markAllSeen } = useEventNotifications()

  React.useEffect(() => { refresh() }, [refresh])

  const all = React.useMemo(() => {
    const pings = pingItems.map(p => ({ ...p, seen_at: p.read_at, _isPing: true }))
    return [...pings, ...events].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [pingItems, events])

  const markAll = async () => {
    try {
      await markAllReadUpTo()
      markAllSeen()
      toast({ title: 'All notifications marked read' })
    } catch (e) {
      toast({ title: 'Failed to mark all', variant: 'destructive' })
    }
  }

  const onClickRow = async (n: any) => {
    try {
      if (n._isPing && !n.read_at) await markRead([n.id])
      // route by kind if you want:
      // if (n.kind === 'ping' && n.payload?.point) navigate(`/map?c=${...}`)
    } catch {}
  }

  return (
    <main className="pt-14 pb-6 px-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Notifications</h1>
        {all.length > 0 && (
          <button onClick={markAll} className="text-xs text-white/80 underline hover:text-white">Mark all read</button>
        )}
      </div>

      {loading && all.length === 0 && <div className="text-white/70">Loading notifications…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {all.length === 0 && !loading && (
        <div className="text-white/60">No notifications yet</div>
      )}

      <ul className="mt-2 space-y-2">
        {all.map((n: any) => (
          <li key={n.id}>
            <button
              onClick={() => onClickRow(n)}
              className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-left"
            >
              <div className="mt-0.5">{getNotificationIcon(n.kind)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{getNotificationTitle(n)}</div>
                  <div className="text-[11px] text-white/50">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
                {getNotificationSubtitle(n) && (
                  <div className="text-[12px] text-white/70 mt-0.5">{getNotificationSubtitle(n)}</div>
                )}
              </div>
              {!n.seen_at && !n.read_at && <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />}
            </button>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4">
          <button onClick={() => loadMore().catch(()=>{})} className="text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </main>
  )
}