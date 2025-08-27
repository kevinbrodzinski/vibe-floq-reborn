// src/hooks/useWavesNear.ts
import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type WavesReturn =
  Database['public']['Functions']['rpc_waves_near']['Returns']

// Public type (keeps the branch’s exported name alive)
export type WavesNearRow =
  WavesReturn extends Array<infer E> ? E : never

type Params = {
  lat: number
  lng: number
  radiusM?: number
  friendsOnly?: boolean
  minSize?: number
  recentMinutes?: number
  onlyCloseFriends?: boolean
  pollMs?: number
}

type Result = {
  data: WavesNearRow[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Overloads: DI-first (preferred), singleton fallback supported
export function useWavesNear(client: SupabaseClient, params: Params): Result
export function useWavesNear(params: Params): Result

export function useWavesNear(a: SupabaseClient | Params, b?: Params): Result {
  const client = (b ? (a as SupabaseClient) : defaultClient)
  const params = (b ?? (a as Params))

  const {
    lat,
    lng,
    radiusM = 1500,
    friendsOnly = true,
    minSize = 3,
    recentMinutes = 3,
    onlyCloseFriends = false,
    pollMs,
  } = params

  const [data, setData] = useState<WavesNearRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setErr] = useState<Error | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchOnce() {
    setLoading(true)
    setErr(null)
    try {
      const { data, error } = await client
        .rpc('rpc_waves_near', {
          center_lat: lat,
          center_lng: lng,
          radius_m: radiusM,
          friends_only: friendsOnly,
          min_size: minSize,
          recent_minutes: recentMinutes,
          only_close_friends: onlyCloseFriends,
        })
        .returns<WavesReturn>()
      if (error) throw new Error(error.message)
      setData((data ?? null) as WavesNearRow[] | null)
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
  }, [
    lat,
    lng,
    radiusM,
    friendsOnly,
    minSize,
    recentMinutes,
    onlyCloseFriends,
    pollMs,
    client,
  ])

  return { data, loading, error, refetch: fetchOnce }
}