import * as React from 'react'
import { listRallyInbox, respondInvite, subscribeRallyInbox, type RallyInboxItem } from '@/lib/api/rallyInbox'

export function useRallyInbox() {
  const [items, setItems] = React.useState<RallyInboxItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string|null>(null)

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const data = await listRallyInbox()
      setItems(data)
    } catch (e:any) {
      setError(e?.message ?? 'Failed to load rally inbox')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
    const off = subscribeRallyInbox(() => refresh())
    return off
  }, [refresh])

  const join = React.useCallback(async (id: string) => {
    // optimistic
    setItems(prev => prev.map(x => x.rally_id === id ? {...x, invite_status:'joined', responded_at:new Date().toISOString()} : x))
    try { await respondInvite(id, 'joined') } catch { refresh() }
  }, [refresh])

  const decline = React.useCallback(async (id: string) => {
    setItems(prev => prev.map(x => x.rally_id === id ? {...x, invite_status:'declined', responded_at:new Date().toISOString()} : x))
    try { await respondInvite(id, 'declined') } catch { refresh() }
  }, [refresh])

  const unreadCount = React.useMemo(
    () => items.filter(i => i.invite_status === 'pending').length,
    [items]
  )

  return { items, loading, error, refresh, join, decline, unreadCount }
}