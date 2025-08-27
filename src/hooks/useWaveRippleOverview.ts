// src/hooks/useWaveRippleOverview.ts
import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type OverviewReturn =
  Database['public']['Functions']['rpc_wave_ripple_overview']['Returns']

// Public type (keeps the branch's exported name available)
export type WaveRippleOverview =
  OverviewReturn extends Array<infer E> ? E : OverviewReturn

// Local alias for readability
type Overview = WaveRippleOverview

type Params = {
  lat: number
  lng: number
  radiusM?: number
  recentWaveMinutes?: number
  recentRippleMinutes?: number
  onlyCloseFriends?: boolean
  pollMs?: number
}

type Result = {
  data: Overview | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Overloads: DI-first, singleton fallback supported
export function useWaveRippleOverview(client: SupabaseClient, params: Params): Result
export function useWaveRippleOverview(params: Params): Result

export function useWaveRippleOverview(a: SupabaseClient | Params, b?: Params): Result {
  const client = (b ? (a as SupabaseClient) : defaultClient)
  const params = (b ?? (a as Params))

  const {
    lat,
    lng,
    radiusM = 1500,
    recentWaveMinutes = 3,
    recentRippleMinutes = 15,
    onlyCloseFriends = false,
    pollMs,
  } = params

  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setErr] = useState<Error | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchOnce() {
    setLoading(true)
    setErr(null)
    try {
      const { data, error } = await client
        .rpc('rpc_wave_ripple_overview', {
          center_lat: lat,
          center_lng: lng,
          radius_m: radiusM,
          recent_wave_minutes: recentWaveMinutes,
          recent_ripple_minutes: recentRippleMinutes,
          only_close_friends: onlyCloseFriends,
        })
        .returns<OverviewReturn>()
      if (error) throw new Error(error.message)

      // Handle RPCs that return a single row vs an array of rows
      const row: Overview | null = Array.isArray(data)
        ? (data[0] ?? null)
        : ((data as unknown) as Overview | null)

      setData(row)
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
  }, [lat, lng, radiusM, recentWaveMinutes, recentRippleMinutes, onlyCloseFriends, pollMs, client])

  return { data, loading, error, refetch: fetchOnce }
}