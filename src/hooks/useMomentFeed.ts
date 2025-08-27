// src/hooks/useMomentFeed.ts
import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type FeedReturn = Database['public']['Functions']['rpc_session_feed_list']['Returns']

// Public row type (keeps the branch export idea)
export type MomentFeedRow = FeedReturn extends Array<infer E> ? E : FeedReturn

type Options = { pageSize?: number; realtime?: boolean }
type Result = {
  items: MomentFeedRow[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => Promise<void>
}

// Overloads: DI-first (preferred), singleton fallback supported
export function useMomentFeed(client: SupabaseClient, floqId: string, opts?: Options): Result
export function useMomentFeed(floqId: string, opts?: Options): Result

export function useMomentFeed(
  a: SupabaseClient | string,
  b?: string | Options,
  c?: Options
): Result {
  const client = typeof a !== 'string' ? a : defaultClient
  const floqId = (typeof a === 'string' ? a : (b as string))!
  const opts = (typeof a === 'string' ? (b as Options) : c) ?? {}
  const pageSize = opts.pageSize ?? 30
  const realtime = opts.realtime ?? true

  const [items, setItems] = useState<MomentFeedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setErr] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    setErr(null)
    try {
      const { data, error } = await client
        .rpc('rpc_session_feed_list' as any, {
          in_floq_id: floqId,
          in_limit: pageSize,
          in_before: cursor,
        } as any)
        .returns<FeedReturn>()
      if (error) throw new Error(error.message)

      const rows = (data ?? []) as MomentFeedRow[]
      setItems(prev => [...prev, ...rows])
      setCursor(rows.length > 0 ? rows[rows.length - 1].created_at : cursor)
      setHasMore(rows.length === pageSize)
    } catch (e: any) {
      setErr(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [client, floqId, pageSize, cursor, hasMore, loading])

  // Reset when floq changes
  useEffect(() => {
    setItems([])
    setCursor(null)
    setHasMore(true)
  }, [floqId])

  // Optional realtime refresh on write/changes
  useEffect(() => {
    if (!realtime) return
    const ch = client
      .channel(`feed-${floqId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floq_session_feed', filter: `floq_id=eq.${floqId}` },
        () => {
          setItems([])
          setCursor(null)
          setHasMore(true)
          void loadMore()
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(ch)
    }
  }, [client, floqId, realtime, loadMore])

  return { items, loading, error, hasMore, loadMore }
}

// --------------------
// Post helper (DI-first, fallback supported)
// --------------------
type PostPayload =
  | { kind: 'text'; text: string }
  | { kind: 'audio'; storageKey: string; durationSec: number }
  | { kind: 'photo'; storageKey: string }
  | { kind: 'vibe'; text?: string }

export async function postMomentFeed(
  client: SupabaseClient,
  floqId: string,
  payload: PostPayload
): Promise<void>
export async function postMomentFeed(
  floqId: string,
  payload: PostPayload
): Promise<void>
export async function postMomentFeed(
  a: SupabaseClient | string,
  b: string | PostPayload,
  c?: PostPayload
): Promise<void> {
  const client = typeof a !== 'string' ? a : defaultClient
  const floqId = typeof a === 'string' ? a : (b as string)
  const payload = (typeof a === 'string' ? (b as PostPayload) : c!) as PostPayload

  if (payload.kind === 'text') {
    const { error } = await client.rpc('rpc_session_post' as any, {
      in_floq_id: floqId,
      in_kind: 'text',
      in_storage_key: null,
      in_text: payload.text,
      in_duration_sec: null,
    } as any)
    if (error) throw new Error(error.message)
    return
  }

  if (payload.kind === 'audio') {
    const { error } = await client.rpc('rpc_session_post' as any, {
      in_floq_id: floqId,
      in_kind: 'audio',
      in_storage_key: payload.storageKey,
      in_text: null,
      in_duration_sec: payload.durationSec,
    } as any)
    if (error) throw new Error(error.message)
    return
  }

  if (payload.kind === 'photo') {
    const { error } = await client.rpc('rpc_session_post' as any, {
      in_floq_id: floqId,
      in_kind: 'photo',
      in_storage_key: payload.storageKey,
      in_text: null,
      in_duration_sec: null,
    } as any)
    if (error) throw new Error(error.message)
    return
  }

  // vibe
  const { error } = await client.rpc('rpc_session_post' as any, {
    in_floq_id: floqId,
    in_kind: 'vibe',
    in_storage_key: null,
    in_text: payload.text ?? null,
    in_duration_sec: null,
  } as any)
  if (error) throw new Error(error.message)
}