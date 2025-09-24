import * as React from 'react'
import { supabase } from '@/integrations/supabase/client'

type Options = {
  /** Optional: re-fetch on an interval (ms). Disabled by default. */
  pollMs?: number
}

export function useUnreadCount(opts: Options = {}) {
  const [count, setCount] = React.useState<number>(0)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      // Fast, indexed head-count query (uses notif_to_profile_unread_created_idx)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        setCount(0)
        setLoading(false)
        return
      }
      const q = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('to_profile', userData.user.id)
        .is('read_at', null)

      const { count: c, error } = await q
      if (error) throw error
      setCount(c ?? 0)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load unread notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    refresh()
  }, [refresh])

  // Optional polling (disabled by default)
  React.useEffect(() => {
    if (!opts.pollMs) return
    const id = window.setInterval(() => refresh(), opts.pollMs)
    return () => window.clearInterval(id)
  }, [opts.pollMs, refresh])

  // Realtime updates
  React.useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const toProfile = user?.id
      // If we can't resolve user yet, just do nothing. Caller can refresh after auth.
      if (!toProfile) return

      channel = supabase
        .channel(`notif-unread:${toProfile}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `to_profile=eq.${toProfile}`
          },
          (payload) => {
            const n = payload.new as { read_at: string | null }
            if (n?.read_at == null) {
              // unread insert → bump
              setCount(c => c + 1)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `to_profile=eq.${toProfile}`
          },
          (payload) => {
            // Enhanced transition detection - only decrement on real unread→read transition
            const n = payload.new as { read_at: string | null }
            const o = (payload as any).old as { read_at: string | null } | undefined

            // Unread -> Read: decrement
            if (o?.read_at == null && n?.read_at != null) {
              setCount(c => Math.max(0, c - 1))
            }
            // Read -> Unread (unlikely, but robust): increment
            else if (o?.read_at != null && n?.read_at == null) {
              setCount(c => c + 1)
            }
            // If we're unsure about transition, do a safe refresh
            else if (!o) {
              refresh()
            }
          }
        )
        .subscribe()
    }

    setupChannel()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [refresh])

  // Refresh on tab focus (cheap, keeps perfect accuracy)
  React.useEffect(() => {
    const onVis = () => { 
      if (document.visibilityState === 'visible') refresh() 
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  return { count, loading, error, refresh }
}
