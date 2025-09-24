import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

export function useDmReactions(threadId: string) {
  const profileId = useCurrentUserId();
  const qc = useQueryClient();
  const key = ['messages', 'dm', threadId];

  // Build a reactions map from the current cache
  const byMessage = useMemo(() => {
    const data = qc.getQueryData<any>(key);
    const map: Record<string, Array<{emoji: string; count: number; reactors: string[]}>> = {};
    for (const page of data?.pages ?? []) {
      for (const m of page ?? []) {
        if (!m) continue;
        map[m.id] = m.reactions ?? [];
      }
    }
    return map;
  }, [qc, key]);

  const toggle = async (messageId: string, emoji: string) => {
    if (!profileId) return;

    // optimistic update
    qc.setQueryData(key, (old: any) => {
      if (!old) return old;
      const pages = old.pages?.map((page: any[]) =>
        page.map((m) => {
          if (m?.id !== messageId) return m;
          const list = m.reactions ?? [];
          const idx = list.findIndex((r) => r.emoji === emoji);
          if (idx === -1) {
            return { ...m, reactions: [...list, { emoji, count: 1, reactors: [profileId] }] };
          } else {
            const r = list[idx];
            const mine = r.reactors.includes(profileId);
            const reactors = mine ? r.reactors.filter(x => x !== profileId) : [...r.reactors, profileId];
            const count = Math.max(0, mine ? r.count - 1 : r.count + 1);
            const next = [...list];
            if (count === 0) next.splice(idx, 1);
            else next[idx] = { ...r, reactors, count };
            return { ...m, reactions: next };
          }
        })
      );
      return { ...old, pages };
    });

    try {
      // try insert; if unique violation, delete (toggle)
      const { error: insErr } = await supabase
        .from('direct_message_reactions')
        .insert({ message_id: messageId, profile_id: profileId, emoji } as any);

      if (insErr) {
        // 23505 unique violation — toggle off
        if ((insErr as any).code === '23505') {
          await supabase
            .from('direct_message_reactions')
            .delete()
            .eq('message_id', messageId as any)
            .eq('profile_id', profileId as any)
            .eq('emoji', emoji as any);
        } else {
          throw insErr;
        }
      }

      // normalize from server
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      console.error('toggle reaction failed', e);
      qc.invalidateQueries({ queryKey: key }); // revert via refetch
    }
  };

  // realtime: refresh on any reaction change
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`dm_reactions:${threadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'direct_message_reactions'
      }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, qc, key]);

  return { byMessage, toggle };
}