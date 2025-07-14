import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationCounts } from '@/hooks/useUnreadCounts';
import { useAuth } from '@/providers/AuthProvider';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export const NotificationBell = ({ onClick, className }: NotificationBellProps) => {
  const { user } = useAuth();
  const { data: notificationCounts } = useNotificationCounts(user?.id);

  const totalUnread = notificationCounts?.notifications || 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={className}
        aria-label={`Notifications${totalUnread > 0 ? ` (${totalUnread} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
      </Button>
      
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
    </div>
  );
};