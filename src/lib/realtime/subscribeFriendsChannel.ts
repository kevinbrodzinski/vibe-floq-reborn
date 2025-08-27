import { supabase } from '@/integrations/supabase/client';

export function subscribeFriendsChannel(
  uid: string,
  onInvalidate: () => void
) {
  /* One channel per user keeps it neat */
  const ch = supabase
    .channel(`friends_presence:${uid}`)

    /* any change to *your* friendships row */
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships',
        filter: `profile_low=eq.${uid},profile_high=eq.${uid}` },
      onInvalidate
    )

    /* any change to presence of *other* users
       (exclude your own uid to avoid self-spam) */
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'presence',
        filter: `profile_id=neq.${uid}` },
      onInvalidate
    )

    .subscribe();

  return ch;
}