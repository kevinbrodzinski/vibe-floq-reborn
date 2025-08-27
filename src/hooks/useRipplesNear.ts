// src/hooks/useRipplesNear.ts
import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type RipplesNearReturn =
  Database['public']['Functions']['rpc_ripples_near']['Returns'] // usually RipplesNearRow[]
export type RipplesNearRow =
  RipplesNearReturn extends Array<infer E> ? E : never

type Params = {
  lat: number
  lng: number
  radiusM?: number
  friendsOnly?: boolean
  recentMinutes?: number
  onlyCloseFriends?: boolean
  pollMs?: number
}

type Result = {
  data: RipplesNearRow[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Overloads: prefer DI (main), allow singleton (branch)
export function useRipplesNear(client: SupabaseClient, params: Params): Result
export function useRipplesNear(params: Params): Result

export function useRipplesNear(a: SupabaseClient | Params, b?: Params): Result {
  const client = (b ? (a as SupabaseClient) : defaultClient)
  const params = (b ?? (a as Params))

  const {
    lat,
    lng,
    radiusM = 1500,
    friendsOnly = false,
    recentMinutes = 15,
    onlyCloseFriends = false,
    pollMs,
  } = params

  const [data, setData] = useState<RipplesNearRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setErr] = useState<Error | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchOnce() {
    try {
      setLoading(true)
      setErr(null)
      const { data, error } = await client
        .rpc('rpc_ripples_near', {
          center_lat: lat,
          center_lng: lng,
          radius_m: radiusM,
          friends_only: friendsOnly,
          recent_minutes: recentMinutes,
          only_close_friends: onlyCloseFriends,
        })
        .returns<RipplesNearReturn>()
      if (error) throw new Error(error.message)
      setData((data ?? null) as RipplesNearRow[] | null)
    } catch (e: any) {
      setErr(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOnce()
    if (pollMs && pollMs > 0) {
      timer.current = setInterval(fetchOnce, pollMs)
      return () => {
        if (timer.current) clearInterval(timer.current)
      }
    }
    return
    // include client so DI updates are respected
  }, [lat, lng, radiusM, friendsOnly, recentMinutes, onlyCloseFriends, pollMs, client])

  return { data, loading, error: error, refetch: fetchOnce }
}