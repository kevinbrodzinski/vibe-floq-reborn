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
      .eq('profile_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.visibility) setVisibility(data.visibility as any);
      });
  }, [user?.id, setVisibility]);

  /* 2️⃣ push local change */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        // Note: This should be using a different table that matches the visibility concept
        // For now, we'll skip the database sync as vibes_now has different schema
        console.log('Visibility updated locally:', visibility);
      } catch (error) {
        console.warn('Failed to sync visibility to database:', error);
      }
    })();
  }, [user?.id, visibility]);

  /* 3️⃣ listen for remote change */
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`vibe-visibility-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vibes_now', filter: `profile_id=eq.${user.id}` },
        ({ new: row }) => row.visibility && setVisibility(row.visibility as any),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vibes_now', filter: `profile_id=eq.${user.id}` },
        ({ new: row }) => row.visibility && setVisibility(row.visibility as any),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'vibes_now', filter: `profile_id=eq.${user.id}` },
        () => setVisibility('public'), // Reset to default when row is deleted
      )
      .subscribe();
    return () => {
      channel.unsubscribe().catch(console.error);
    };
  }, [user?.id, setVisibility]);
}