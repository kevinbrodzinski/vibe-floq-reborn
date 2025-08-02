import { formatDistanceToNow } from 'date-fns';
import { Bell, MessageCircle, Calendar, Users, Trophy, UserPlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { useNotificationActions } from '@/hooks/useNotificationActions';

interface EventNotification {
  id: string;
  profile_id: string;
  kind: string;
  payload: any;
  created_at: string;
  seen_at?: string;
}

const getNotificationIcon = (kind: string) => {
  switch (kind) {
    case 'friend_request':
      return <UserPlus className="w-4 h-4" />;
    case 'friend_request_accepted':
    case 'friend_request_declined':
      return <Users className="w-4 h-4" />;
    case 'floq_invite':
    case 'floq_invite_accepted':
    case 'floq_invite_declined':
      return <Users className="w-4 h-4" />;
    case 'plan_invite':
    case 'plan_invite_accepted':
    case 'plan_invite_declined':
      return <Calendar className="w-4 h-4" />;
    case 'floq_reaction':
    case 'floq_reply':
      return <MessageCircle className="w-4 h-4" />;
    case 'dm':
      return <Mail className="w-4 h-4" />;
    case 'plan_comment_new':
    case 'plan_checkin':
      return <Calendar className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationColor = (kind: string) => {
  switch (kind) {
    case 'friend_request':
    case 'friend_request_accepted':
    case 'friend_request_declined':
      return 'text-purple-500';
    case 'floq_invite':
    case 'floq_invite_accepted':
    case 'floq_invite_declined':
      return 'text-orange-500';
    case 'plan_invite':
    case 'plan_invite_accepted':
    case 'plan_invite_declined':
    case 'plan_comment_new':
    case 'plan_checkin':
      return 'text-green-500';
    case 'floq_reaction':
    case 'floq_reply':
      return 'text-blue-500';
    case 'dm':
      return 'text-indigo-500';
    default:
      return 'text-muted-foreground';
  }
};

const getNotificationTitle = (notification: EventNotification) => {
  const { kind, payload } = notification;
  
  switch (kind) {
    case 'friend_request':
      return `New friend request from ${payload?.from_username || 'someone'}`;
    case 'friend_request_accepted':
      return `${payload?.from_username || 'Someone'} accepted your friend request`;
    case 'friend_request_declined':
      return `${payload?.from_username || 'Someone'} declined your friend request`;
    case 'floq_invite':
      return `${payload?.from_username || 'Someone'} invited you to join a floq`;
    case 'floq_invite_accepted':
      return `${payload?.from_username || 'Someone'} accepted your floq invitation`;
    case 'floq_invite_declined':
      return `${payload?.from_username || 'Someone'} declined your floq invitation`;
    case 'plan_invite':
      return `${payload?.from_username || 'Someone'} invited you to a plan`;
    case 'plan_invite_accepted':
      return `${payload?.from_username || 'Someone'} accepted your plan invitation`;
    case 'plan_invite_declined':
      return `${payload?.from_username || 'Someone'} declined your plan invitation`;
    case 'floq_reaction':
      return `${payload?.from_username || 'Someone'} reacted to your message`;
    case 'floq_reply':
      return `${payload?.from_username || 'Someone'} replied to your message`;
    case 'dm':
      return `New message from ${payload?.from_username || 'someone'}`;
    case 'plan_comment_new':
      return `New comment on ${payload?.plan_title || 'your plan'}`;
    case 'plan_checkin':
      return `${payload?.from_username || 'Someone'} checked in to ${payload?.plan_title || 'a plan'}`;
    default:
      return 'Notification';
  }
};

const getNotificationSubtitle = (notification: EventNotification) => {
  const { kind, payload } = notification;
  
  switch (kind) {
    case 'dm':
      return payload?.preview ? `"${payload.preview}"` : undefined;
    case 'floq_invite':
      return payload?.floq_title ? `Floq: ${payload.floq_title}` : undefined;
    case 'plan_invite':
      return payload?.plan_title ? `Plan: ${payload.plan_title}` : undefined;
    default:
      return undefined;
  }
};

export const NotificationsList = () => {
  const { toast } = useToast();
  const { unseen: notifications, markAsSeen, markAllSeen } = useEventNotifications();
  const { handleNotificationTap } = useNotificationActions();

  const handleMarkAsRead = (notificationIds: string[]) => {
    markAsSeen(notificationIds);
  };

  const handleMarkAllAsRead = () => {
    markAllSeen();
    toast({
      title: "All notifications marked as read"
    });
  };

  const handleNotificationClick = (notification: EventNotification) => {
    // Always handle notification tap for navigation and mark as seen
    handleNotificationTap(notification);
  };


  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No notifications yet</p>
        <p className="text-sm">You'll see new notifications here</p>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.seen_at);

  return (
    <div className="space-y-4">
      {unreadNotifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {unreadNotifications.length} unread
            </span>
            <Badge variant="destructive" className="text-xs">
              {unreadNotifications.length}
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="text-xs"
          >
            Mark all read
          </Button>
        </div>
      )}

      <ScrollArea className="max-h-96">
        <div className="space-y-2 px-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                notification.seen_at 
                  ? 'bg-muted/20 border-border/50' 
                  : 'bg-card border-border hover:bg-muted/30'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${getNotificationColor(notification.kind)}`}>
                  {getNotificationIcon(notification.kind)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        notification.seen_at ? 'text-muted-foreground' : 'text-foreground'
                      }`}>
                        {getNotificationTitle(notification)}
                      </p>
                      {getNotificationSubtitle(notification) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getNotificationSubtitle(notification)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.seen_at && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};