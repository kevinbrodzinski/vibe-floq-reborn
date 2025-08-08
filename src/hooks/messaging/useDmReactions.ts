import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { useEffect } from 'react';

export function useDmReactions(threadId: string) {
  const profileId = useCurrentUserId();
  const qc = useQueryClient();

  const toggle = async (messageId: string, emoji: string) => {
    if (!profileId) return;

    try {
      // 1) try insert
      const { error: insErr } = await supabase
        .from('direct_message_reactions')
        .insert({ message_id: messageId, profile_id: profileId, emoji });

      if (insErr) {
        // 2) if duplicate, delete (toggle off)
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

      // 3) refresh the message view (pulls new aggregated reactions)
      qc.invalidateQueries({ queryKey: ['messages', 'dm', threadId] });
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
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
        qc.invalidateQueries({ queryKey: ['messages', 'dm', threadId] });
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(ch); 
    };
  }, [threadId, qc]);

  return { toggle };
}