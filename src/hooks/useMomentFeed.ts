// src/hooks/useMomentFeed.ts
import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type FeedRow = {
  id: string;
  author_profile_id: string;
  kind: 'photo' | 'audio' | 'text' | 'vibe';
  storage_key: string | null;
  text_content: string | null;
  duration_sec: number | null;
  created_at: string;
};

export function useMomentFeed(
  client: SupabaseClient,
  floqId: string,
  opts?: { pageSize?: number }
) {
  const pageSize = opts?.pageSize ?? 30;
  const [items, setItems] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    setErr(null);
    const { data, error } = await client.rpc('rpc_session_feed_list', {
      in_floq_id: floqId,
      in_limit: pageSize,
      in_before: cursor
    });
    if (error) setErr(new Error(error.message));
    const rows = (data ?? []) as FeedRow[];
    setItems(prev => [...prev, ...rows]);
    setCursor(rows.length > 0 ? rows[rows.length - 1].created_at : cursor);
    setHasMore(rows.length === pageSize);
    setLoading(false);
  }, [client, floqId, pageSize, cursor, hasMore, loading]);

  useEffect(() => {
    // reset if floqId changes
    setItems([]); setCursor(null); setHasMore(true);
  }, [floqId]);

  return { items, loading, error, hasMore, loadMore };
}

export async function postMomentFeed(
  client: SupabaseClient,
  floqId: string,
  payload:
    | { kind: 'text'; text: string }
    | { kind: 'audio'; storageKey: string; durationSec: number }
    | { kind: 'photo'; storageKey: string }
    | { kind: 'vibe'; text?: string }
) {
  if (payload.kind === 'text') {
    return client.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'text',
      in_storage_key: null,
      in_text: payload.text,
      in_duration_sec: null
    });
  }
  if (payload.kind === 'audio') {
    return client.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'audio',
      in_storage_key: payload.storageKey,
      in_text: null,
      in_duration_sec: payload.durationSec
    });
  }
  if (payload.kind === 'photo') {
    return client.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'photo',
      in_storage_key: payload.storageKey,
      in_text: null,
      in_duration_sec: null
    });
  }
  // vibe
  return client.rpc('rpc_session_post', {
    in_floq_id: floqId,
    in_kind: 'vibe',
    in_storage_key: null,
    in_text: payload.text ?? null,
    in_duration_sec: null
  });
}