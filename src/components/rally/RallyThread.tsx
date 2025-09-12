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
    
    // Mark rally as read when thread opens with debounce
    let timeout: any;
    const markRead = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          const me = user.user?.id;
          if (!me) return;
          
          const when = new Date().toISOString();
          await supabase
            .from('rally_last_seen')
            .upsert({ profile_id: me, rally_id: rallyId, last_seen_at: when }, { onConflict: 'profile_id,rally_id' });
        } catch (e) {
          console.warn('Mark read failed:', e);
        }
      }, 150);
    };

    markRead();
    return () => clearTimeout(timeout);
  }, [rallyId]);

  // Auto-scroll to first unread message
  React.useEffect(() => {
    if (!firstUnreadAt) return;
    
    const scrollToFirstUnread = () => {
      const el = document.querySelector<HTMLElement>(`[data-created-at="${firstUnreadAt}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };

    const timer = setTimeout(scrollToFirstUnread, 100);
    return () => clearTimeout(timer);
  }, [firstUnreadAt]);

  return <>{children}</>;
}