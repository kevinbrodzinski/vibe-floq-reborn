import React from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

interface MentionNotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export const MentionNotificationBell: React.FC<MentionNotificationBellProps> = ({ 
  onClick, 
  className 
}) => {
  const { stats, getNotificationsByCategory } = useNotifications();
  
  // Get mention notifications from floq category
  const floqNotifications = getNotificationsByCategory().floqs;
  const mentionCount = floqNotifications.filter(n => n.kind === 'floq_mention').length;

  if (mentionCount === 0) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`relative ${className || ''}`}
      aria-label={`Mentions (${mentionCount} unread)`}
    >
      <Bell className="w-5 h-5" />
      
      {mentionCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-xs flex items-center justify-center px-1 pointer-events-none font-medium"
          role="status"
          aria-label={`${mentionCount} unread mention${mentionCount === 1 ? '' : 's'}`}
        >
          {mentionCount > 99 ? '99+' : mentionCount}
        </Badge>
      )}
    </Button>
  );
};