import {
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ChatMessage,
  PAGE_SIZE,
  Surface,
} from '@/lib/chat/api';
import { markRead } from '@/hooks/chat/useMarkRead';

/* main hook ----------------------------------------------------------------*/
export const useChatTimeline = (
  surface:  Surface,
  threadId: string,
  profileId: string,
  opts:     { enabled?: boolean } = {},
) => {
  const qc       = useQueryClient();
  const queryKey = ['chat', surface, threadId];

  /* 1️⃣  infinite query ---------------------------------------------------- */
  const query = useInfiniteQuery<ChatMessage[]>({
    queryKey,
    enabled: opts.enabled ?? true,
    initialPageParam: null as string | null,
    getNextPageParam: last => last.at(0)?.created_at ?? null,
    queryFn: async ({ pageParam }) => {
      const table  = surface === 'dm' ? 'direct_messages' : 'chat_messages';
      const select =
        surface === 'dm'
          ? 'id, thread_id, sender_id, content, metadata, reply_to_id, message_type, delivery_status, created_at'
          : 'id, thread_id, sender_id, body, metadata, reply_to_id, message_type, delivery_status, created_at';

      let q = supabase.from(table).select(select)
        .eq('thread_id', threadId as any)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) q = q.lt('created_at', pageParam);

      const { data, error } = await q;
      if (error) throw error;

      /* -- reaction join for DMs only ------------------------------------ */
      const withReactions = async (rows: any[]): Promise<ChatMessage[]> => {
        if (surface !== 'dm' || rows.length === 0) {
          return rows.map(mapFloqRow).reverse();
        }

        // Fallback: skip reaction enrichment for now
        return rows.map(mapFloqRow).reverse();
      };

      return withReactions(data ?? []);
    },
  });

  /* 2️⃣  realtime inserts -------------------------------------------------- */
  useEffect(() => {
    if (!threadId) return;

    const pk = surface === 'dm'
      ? 'thread_id'
      : surface === 'floq'
      ? 'floq_id'
      : 'plan_id';

    const ch = supabase
      .channel(`chat_${surface}_${threadId}`)
      .on('postgres_changes', {
        event : 'INSERT',
        schema: 'public',
        table : surface === 'dm' ? 'direct_messages' : 'chat_messages',
        filter: `${pk}=eq.${threadId}`,
      }, () => qc.invalidateQueries({ queryKey }))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [surface, threadId, qc, queryKey]);

  /* 3️⃣  realtime reactions (DM only) ------------------------------------- */
  useEffect(() => {
    if (surface !== 'dm' || !threadId) return;

    const ch = supabase
      .channel(`dm_reactions_${threadId}`)
      .on('postgres_changes', {
        event : '*',
        schema: 'public',
        table : 'dm_message_reactions',
      }, () => qc.invalidateQueries({ queryKey }))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [surface, threadId, qc, queryKey]);

  /* 4️⃣  auto-mark-read ---------------------------------------------------- */
  useEffect(() => {
    if (query.data?.pages?.[0]?.length)
      markRead({ p_surface: surface, p_thread_id: threadId, p_profile_id: profileId })
        .catch(() => {});
  }, [query.data?.pages?.[0]?.length, surface, threadId, profileId]);

  return query;
};

/* helper: align floq / plan rows to ChatMessage shape */
function mapFloqRow(r: any): ChatMessage {
  return { ...r, content: r.body ?? r.content, reactions: {} } as ChatMessage;
}