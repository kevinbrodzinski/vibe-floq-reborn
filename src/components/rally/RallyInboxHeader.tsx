import * as React from 'react';
import { useRallyInbox } from '@/hooks/useRallyInbox';
import { RallyUnreadBadge } from '@/components/rally/RallyUnreadBadge';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/button';
import { Mail, CheckCheck } from 'lucide-react';

export function RallyInboxHeader({ onOpen }: { onOpen: () => void }) {
  const { unreadCount, loading, markAllRead } = useRallyInbox();
  const [markingAllRead, setMarkingAllRead] = React.useState(false);

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return;
    setMarkingAllRead(true);
    try { await markAllRead(); } catch (e) { /* no-op */ } finally { setMarkingAllRead(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <IconButton label="Open rally inbox" onClick={onOpen} size="md" variant="ghost">
          <Mail className="h-5 w-5" />
        </IconButton>
        <div className="pointer-events-none absolute -right-1 -top-1">
          {!loading && <RallyUnreadBadge count={unreadCount} aria-label="Rally inbox unread" />}
        </div>
      </div>
      
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={markingAllRead}
          className="text-xs"
        >
          <CheckCheck className="mr-1 h-4 w-4" />
          {markingAllRead ? 'Marking...' : 'Mark all read'}
        </Button>
      )}
    </div>
  );
}