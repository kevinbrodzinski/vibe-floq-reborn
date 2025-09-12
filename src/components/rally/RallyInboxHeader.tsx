import * as React from 'react';
import { useRallyUnread } from '@/hooks/useRallyUnread';
import { RallyUnreadBadge } from '@/components/rally/RallyUnreadBadge';
import { IconButton } from '@/components/ui/IconButton';
import { Mail } from 'lucide-react';

export function RallyInboxHeader({ onOpen }: { onOpen: () => void }) {
  const { count, loading } = useRallyUnread();

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <IconButton label="Open rally inbox" onClick={onOpen} size="md" variant="ghost">
          <Mail className="h-5 w-5" />
        </IconButton>
        <div className="pointer-events-none absolute -right-1 -top-1">
          {!loading && <RallyUnreadBadge count={count} aria-label="Rally inbox unread" />}
        </div>
      </div>
    </div>
  );
}