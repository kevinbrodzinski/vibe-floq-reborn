import * as React from 'react'
import { listRallyInbox, respondInvite, subscribeRallyInbox, type RallyInboxItem } from '@/lib/api/rallyInbox'
import { markRallyRead, markAllRalliesRead } from '@/lib/api/rallyRead'

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
    setItems(prev => prev.map(x => x.rally_id === id ? {...x, invite_status:'joined', responded_at:new Date().toISOString()} : x))
    try { await respondInvite(id, 'joined') } catch { refresh() }
  }, [refresh])

  const decline = React.useCallback(async (id: string) => {
    setItems(prev => prev.map(x => x.rally_id === id ? {...x, invite_status:'declined', responded_at:new Date().toISOString()} : x))
    try { await respondInvite(id, 'declined') } catch { refresh() }
  }, [refresh])

  const markRead = React.useCallback(async (rallyId: string) => {
    setItems(prev => prev.map(x => x.rally_id === rallyId 
      ? { ...x, unread_count: 0, first_unread_at: null } 
      : x));
    try { 
      await markRallyRead(rallyId); 
    } catch { 
      refresh(); 
    }
  }, [refresh])

  const markAllRead = React.useCallback(async () => {
    const previousItems = items
    setItems(prev => prev.map(x => ({...x, unread_count: 0, first_unread_at: null})))
    try {
      await markAllRalliesRead()
    } catch (e) {
      setItems(previousItems)
      throw e
    }
  }, [items])

  const unreadCount = React.useMemo(
    () => items.reduce((sum, item) => sum + (item.unread_count || 0), 0),
    [items]
  )

  const pendingInvites = React.useMemo(
    () => items.filter(i => i.invite_status === 'pending').length,
    [items]
  )

  return { 
    items, 
    loading, 
    error, 
    refresh, 
    join, 
    decline, 
    markRead, 
    markAllRead, 
    unreadCount, 
    pendingInvites 
  }
}