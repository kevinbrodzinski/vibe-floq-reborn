import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export const NotificationBell = ({ onClick, className }: NotificationBellProps) => {
  const { unseen } = useEventNotifications();

  const totalUnread = unseen.length;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`relative ${className || ''}`}
      aria-label={totalUnread > 0 ? `Notifications (${totalUnread} unread)` : 'Notifications'}
    >
      <Bell className="w-5 h-5" />
      
      {totalUnread > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-xs flex items-center justify-center px-1 pointer-events-none font-medium"
          role="status"
          aria-label={`${totalUnread} unread notification${totalUnread === 1 ? '' : 's'}`}
        >
          {totalUnread > 99 ? '99+' : totalUnread}
        </Badge>
      )}
    </Button>
  );
};