import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RallyUnreadBadge } from '@/components/rally/RallyUnreadBadge';
import type { RallyInboxItem } from '@/lib/api/rallyInbox';

interface RallyInboxRowProps {
  item: RallyInboxItem;
  onMarkRead?: (rallyId: string) => Promise<void>;
  onOptimisticUnreadZero?: (rallyId: string) => void;
}

export function RallyInboxRow({ 
  item, 
  onMarkRead,
  onOptimisticUnreadZero 
}: RallyInboxRowProps) {
  const [busy, setBusy] = React.useState(false);

  const handleMarkRead = async () => {
    if (busy || !onMarkRead || !item.unread_count) return;
    setBusy(true);
    try {
      onOptimisticUnreadZero?.(item.rally_id);
      await onMarkRead(item.rally_id);
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border-b border-border/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">
            Rally from {item.creator_name || 'Unknown'}
          </h4>
          {item.unread_count > 0 && (
            <RallyUnreadBadge count={item.unread_count} />
          )}
        </div>
        
        {item.note && (
          <p className="text-muted-foreground text-xs mt-1 truncate">
            {item.note}
          </p>
        )}
        
        {item.last_message_excerpt && (
          <p className="text-muted-foreground text-xs mt-1 truncate">
            {item.last_message_excerpt}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{item.joined_count} joined</span>
          <span>•</span>
          <span>Expires {new Date(item.expires_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      {item.unread_count && onMarkRead ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkRead}
          disabled={busy}
          className="text-xs ml-2"
          aria-label="Mark thread as read"
        >
          {busy ? 'Marking...' : 'Mark read'}
        </Button>
      ) : null}
    </div>
  );
}