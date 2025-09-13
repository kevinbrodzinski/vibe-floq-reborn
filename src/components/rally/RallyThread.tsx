import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RallyThreadProps {
  rallyId: string;
  firstUnreadAt?: string | null;
  children: React.ReactNode;
}

export function RallyThread({ rallyId, firstUnreadAt, children }: RallyThreadProps) {
  React.useEffect(() => {
    if (!rallyId) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const markRead = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          const me = user.user?.id;
          if (!me) return;
          const when = new Date().toISOString();
          await supabase
            .from('rally_last_seen')
            .upsert({ profile_id: me, rally_id: rallyId, last_seen_at: when }, { onConflict: 'profile_id,rally_id' });
        } catch {
          /* no-op */
        }
      }, 150);
    };

    markRead();
    return () => { if (timeout) clearTimeout(timeout); };
  }, [rallyId]);

  React.useEffect(() => {
    if (!firstUnreadAt) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-created-at="${firstUnreadAt}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [firstUnreadAt]);

  return <>{children}</>;
}