import { useEffect } from 'react';
import { useVibe } from '@/lib/store/useVibe';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export function useSyncedVisibility() {
  const query = useAuth();
  const user = query.user;
  const { visibility, setVisibility } = useVibe();

  /* 1️⃣ initial fetch */
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('vibes_now')
      .select('visibility')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.visibility) setVisibility(data.visibility as any);
      });
  }, [user?.id, setVisibility]);

  /* 2️⃣ push local change */
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('vibes_now')
      .upsert(
        { 
          user_id: user.id, 
          visibility,
          updated_at: new Date().toISOString()
        }, 
        { onConflict: 'user_id' }
      );
  }, [user?.id, visibility]);

  /* 3️⃣ listen for remote change */
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`vibe-visibility-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vibes_now', filter: `user_id=eq.${user.id}` },
        ({ new: row }) => row.visibility && setVisibility(row.visibility as any),
      )
      .subscribe();
    return () => channel.unsubscribe();
  }, [user?.id, setVisibility]);
}