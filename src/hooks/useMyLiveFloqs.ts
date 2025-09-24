// src/hooks/useMyLiveFloqs.ts
import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type RpcReturn = Database['public']['Functions']['rpc_my_live_floqs']['Returns']

// Public type (keep the branch's name)
export type MyLiveFloq = RpcReturn extends Array<infer E> ? E : RpcReturn

type Result = {
  data: MyLiveFloq[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// Overloads: DI-first (preferred), singleton fallback supported
export function useMyLiveFloqs(client: SupabaseClient): Result
export function useMyLiveFloqs(): Result

export function useMyLiveFloqs(a?: SupabaseClient): Result {
  const client = a ?? defaultClient

  const [data, setData] = useState<MyLiveFloq[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setErr] = useState<Error | null>(null)

  const fetchOnce = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data, error } = await (client as any).rpc('rpc_my_live_floqs')
      if (error) throw new Error(error.message)

      // Normalize: some RPCs return an array; others may return a single row
      const rows = Array.isArray(data) ? data : (data ? [data] : [])
      setData((rows ?? null) as MyLiveFloq[] | null)
    } catch (e: any) {
      setErr(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOnce() }, [client])

  return { data, loading, error: setErr ? error : null, refetch: fetchOnce }
}
