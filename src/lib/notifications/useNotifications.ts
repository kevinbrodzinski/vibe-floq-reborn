import * as React from 'react'
import { supabase } from '@/integrations/supabase/client'

export type Notif = {
  id: string
  kind: 'ping'
  payload: any
  from_profile: string
  to_profile: string
  created_at: string
  read_at: string | null
}

type Options = {
  pageSize?: number
  onlyUnread?: boolean
}

export function useNotifications({ pageSize = 20, onlyUnread = false }: Options = {}) {
  const [items, setItems] = React.useState<Notif[]>([])
  const [cursor, setCursor] = React.useState<string | null>(null) // created_at cursor
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hasMore, setHasMore] = React.useState(true)

  // initial load
  const load = React.useCallback(async (opts?: { reset?: boolean }) => {
    if (loading) return
    setLoading(true); setError(null)

    try {
      let q = supabase.from('notifications')
        .select('id,kind,payload,from_profile,to_profile,created_at,read_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(pageSize)

      if (onlyUnread) q = q.is('read_at', null)
      if (!opts?.reset && cursor) q = q.lt('created_at', cursor)

      const { data, error } = await q
      if (error) throw error

      const list = data as Notif[]
      if (opts?.reset) {
        setItems(list)
      } else {
        setItems(prev => [...prev, ...list])
      }
      setHasMore(list.length === pageSize)
      setCursor(list.length ? list[list.length - 1].created_at : cursor)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [pageSize, onlyUnread, cursor, loading])

  const refresh = React.useCallback(async () => {
    setCursor(null)
    await load({ reset: true })
  }, [load])

  const loadMore = React.useCallback(async () => {
    if (!hasMore || loading) return
    await load()
  }, [hasMore, loading, load])

  // optimistic mark read by IDs
  const markRead = React.useCallback(async (ids: string[]) => {
    if (!ids?.length) return
    // optimistic
    setItems(prev => prev.map(n => ids.includes(n.id) ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    const { error } = await supabase.rpc('notifications_mark_read', { _ids: ids })
    if (error) {
      // revert if failed
      setItems(prev => prev.map(n => ids.includes(n.id) ? { ...n, read_at: null } : n))
      throw error
    }
  }, [])

  // optimistic mark all up to the newest currently visible
  const markAllReadUpTo = React.useCallback(async () => {
    if (!items.length) return
    const newest = items[0].created_at
    // optimistic
    setItems(prev => prev.map(n => n.created_at <= newest ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n))
    const { error } = await supabase.rpc('notifications_mark_read_upto', { _upto: newest })
    if (error) {
      // revert
      setItems(prev => prev.map(n => n.created_at <= newest ? { ...n, read_at: null } : n))
      throw error
    }
  }, [items])

  // realtime append of new notifications
  React.useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      // grab user to scope the stream (optional; RLS protects anyway)
      const { data: { user } } = await supabase.auth.getUser()
      const toProfile = user?.id
      ch = supabase.channel(`notif:${toProfile ?? 'me'}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          ...(toProfile ? { filter: `to_profile=eq.${toProfile}` } : {})
        }, payload => {
          const row = payload.new as Notif
          setItems(prev => [row, ...prev]) // prepend latest
        })
        .subscribe()
    })()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [])

  return { items, loading, error, hasMore, refresh, loadMore, markRead, markAllReadUpTo }
}