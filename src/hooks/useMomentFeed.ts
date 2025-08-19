import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MomentFeedRow = {
  id: string;
  floq_id: string;
  author_profile_id: string;
  kind: 'photo' | 'audio' | 'text' | 'vibe';
  storage_key: string | null;
  text_content: string | null;
  duration_sec: number | null;
  created_at: string;
};

export function useMomentFeed(
  floqId: string,
  opts?: { pageSize?: number }
) {
  const pageSize = opts?.pageSize ?? 30;
  const [items, setItems] = useState<MomentFeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('rpc_session_feed_list', {
      in_floq_id: floqId,
      in_limit: pageSize,
      in_before: cursor,
    });
    if (error) setError(error.message);
    const rows = (data ?? []) as MomentFeedRow[];
    setItems((prev) => [...prev, ...rows]);
    setCursor(rows.length > 0 ? rows[rows.length - 1].created_at : cursor);
    setHasMore(rows.length === pageSize);
    setLoading(false);
  }, [floqId, pageSize, cursor, hasMore, loading]);

  useEffect(() => {
    // reset when floq changes
    setItems([]);
    setCursor(null);
    setHasMore(true);
  }, [floqId]);

  useEffect(() => {
    // realtime feed subscription
    const ch = supabase
      .channel(`feed-${floqId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'floq_session_feed',
        filter: `floq_id=eq.${floqId}`,
      }, () => {
        // simplest: refresh first page
        setItems([]);
        setCursor(null);
        setHasMore(true);
        void loadMore();
      })
      .subscribe();

    subRef.current = ch;
    return () => { void supabase.removeChannel(ch); };
  }, [floqId, loadMore]);

  return { items, loading, error, hasMore, loadMore };
}

export async function postMomentFeed(
  floqId: string,
  payload:
    | { kind: 'text'; text: string }
    | { kind: 'audio'; storageKey: string; durationSec: number }
    | { kind: 'photo'; storageKey: string }
    | { kind: 'vibe'; text?: string }
) {
  if (payload.kind === 'text') {
    return supabase.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'text',
      in_storage_key: null,
      in_text: payload.text,
      in_duration_sec: null,
    });
  }
  if (payload.kind === 'audio') {
    return supabase.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'audio',
      in_storage_key: payload.storageKey,
      in_text: null,
      in_duration_sec: payload.durationSec,
    });
  }
  if (payload.kind === 'photo') {
    return supabase.rpc('rpc_session_post', {
      in_floq_id: floqId,
      in_kind: 'photo',
      in_storage_key: payload.storageKey,
      in_text: null,
      in_duration_sec: null,
    });
  }
  // vibe
  return supabase.rpc('rpc_session_post', {
    in_floq_id: floqId,
    in_kind: 'vibe',
    in_storage_key: null,
    in_text: payload.text ?? null,
    in_duration_sec: null,
  });
}