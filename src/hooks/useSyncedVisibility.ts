import { useEffect } from 'react';
import { useVibe } from '@/lib/store/useVibe';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export function useSyncedVisibility() {
  const { user } = useAuth();
  const visibility = useVibe((s) => s.visibility);
  const setVisibility = useVibe((s) => s.setVisibility);

  /* ➊ initial fetch */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('vibes_now')
        .select('visibility')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data?.visibility) {
        setVisibility(data.visibility as 'public' | 'friends' | 'off');
      }
    })();
  }, [user, setVisibility]);

  /* ➋ propagate local changes to DB */
  useEffect(() => {
    if (!user) return;
    const upsert = async () => {
      await supabase
        .from('vibes_now')
        .upsert({ user_id: user.id, visibility }, { onConflict: 'user_id' });
    };
    upsert();
  }, [user, visibility]);

  /* ➌ listen for remote changes */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`vibe-visibility-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vibes_now', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.visibility) {
            setVisibility(payload.new.visibility as 'public' | 'friends' | 'off');
          }
        },
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [user, setVisibility]);
}