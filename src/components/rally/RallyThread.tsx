import * as React from 'react';
import { markRallyRead } from '@/lib/api/rallyInbox';

interface RallyThreadProps {
  rallyId: string;
  firstUnreadAt?: string | null;
  children: React.ReactNode;
}

export function RallyThread({ rallyId, firstUnreadAt, children }: RallyThreadProps) {
  React.useEffect(() => {
    if (!rallyId) return;
    
    // Mark rally as read when thread opens
    markRallyRead(rallyId).catch(console.warn);
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

    // Small delay to allow messages to render
    const timer = setTimeout(scrollToFirstUnread, 100);
    return () => clearTimeout(timer);
  }, [firstUnreadAt]);

  return <div className="rally-thread">{children}</div>;
}