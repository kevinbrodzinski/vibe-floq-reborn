import React, { useEffect, useMemo } from 'react';
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

    // Optimistic update
    qc.setQueryData(key, (old: any) => {
      if (!old) return old;
      
      const pages = old.pages?.map((page: any[]) =>
        page.map((m) => {
          if (m?.id !== messageId) return m;
          
          const list = m.reactions ?? [];
          const idx = list.findIndex((r) => r.emoji === emoji);
          
          if (idx === -1) {
            // Add new reaction
            return { 
              ...m, 
              reactions: [...list, { emoji, count: 1, reactors: [profileId] }] 
            };
          } else {
            // Toggle existing reaction
            const r = list[idx];
            const hasReacted = r.reactors.includes(profileId);
            const reactors = hasReacted 
              ? r.reactors.filter((x) => x !== profileId)
              : [...r.reactors, profileId];
            const count = Math.max(0, hasReacted ? r.count - 1 : r.count + 1);
            
            const next = [...list];
            if (count === 0) {
              // Remove reaction if count is 0
              next.splice(idx, 1);
            } else {
              next[idx] = { ...r, reactors, count };
            }
            
            return { ...m, reactions: next };
          }
        })
      );
      
      return { ...old, pages };
    });

    try {
      // Server update
      const { error: insErr } = await supabase
        .from('direct_message_reactions')
        .insert({ message_id: messageId, profile_id: profileId, emoji });

      if (insErr) {
        // If duplicate, delete (toggle off)
        if ((insErr as any).code === '23505') {
          await supabase
            .from('direct_message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('profile_id', profileId)
            .eq('emoji', emoji);
        } else {
          throw insErr;
        }
      }

      // Refresh from server to ensure consistency
      qc.invalidateQueries({ queryKey: key });
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      // Revert optimistic update on error
      qc.invalidateQueries({ queryKey: key });
    }
  };

  // Realtime: on any reaction change, refresh the page
  useEffect(() => {
    if (!threadId) return;
    
    const ch = supabase
      .channel(`dmr:${threadId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'direct_message_reactions' 
      }, () => {
        qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(ch); 
    };
  }, [threadId, qc, key]);

  return { byMessage, toggle };
}