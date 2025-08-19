import React from 'react';
import { Bell, MessageCircle, UserPlus, UserCheck, UserX, Calendar, MapPin, Heart, Reply, Waves, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { MomentaryFloqNotificationItem } from './MomentaryFloqNotificationItem';
import { MomentaryFloqNotificationModal } from './MomentaryFloqNotificationModal';

const getNotificationIcon = (kind: string) => {
  switch (kind) {
    case 'dm':
      return <MessageCircle className="w-4 h-4" />;
    case 'friend_request':
      return <UserPlus className="w-4 h-4" />;
    case 'friend_request_accepted':
      return <UserCheck className="w-4 h-4" />;
    case 'friend_request_declined':
      return <UserX className="w-4 h-4" />;
    case 'plan_invite':
    case 'plan_invite_accepted':
    case 'plan_invite_declined':
      return <Calendar className="w-4 h-4" />;
    case 'floq_invite':
    case 'floq_invite_accepted':
    case 'floq_invite_declined':
      return <MapPin className="w-4 h-4" />;
    case 'floq_reaction':
      return <Heart className="w-4 h-4" />;
    case 'floq_reply':
      return <Reply className="w-4 h-4" />;
    // Momentary Floq notifications
    case 'momentary_floq_created':
    case 'friend_started_floq_nearby':
      return <Waves className="w-4 h-4" />;
    case 'momentary_floq_friend_joined':
      return <Users className="w-4 h-4" />;
    case 'momentary_floq_nearby':
    case 'wave_activity_friend':
      return <Zap className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationColor = (kind: string) => {
  switch (kind) {
    case 'dm':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
    case 'friend_request':
      return 'text-green-500 bg-green-50 dark:bg-green-950/20';
    case 'friend_request_accepted':
      return 'text-green-500 bg-green-50 dark:bg-green-950/20';
    case 'friend_request_declined':
      return 'text-red-500 bg-red-50 dark:bg-red-950/20';
    case 'plan_invite':
    case 'plan_invite_accepted':
    case 'plan_invite_declined':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-950/20';
    case 'floq_invite':
    case 'floq_invite_accepted':
    case 'floq_invite_declined':
      return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20';
    case 'floq_reaction':
      return 'text-pink-500 bg-pink-50 dark:bg-pink-950/20';
    case 'floq_reply':
      return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20';
    // Momentary Floq notifications
    case 'momentary_floq_created':
    case 'friend_started_floq_nearby':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-950/20';
    case 'momentary_floq_friend_joined':
      return 'text-green-500 bg-green-50 dark:bg-green-950/20';
    case 'momentary_floq_nearby':
    case 'wave_activity_friend':
      return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    default:
      return 'text-gray-500 bg-gray-50 dark:bg-gray-950/20';
  }
};

const getNotificationTitle = (notification: any) => {
  switch (notification.kind) {
    case 'dm':
      return 'New Message';
    case 'friend_request':
      return 'New Friend Request';
    case 'friend_request_accepted':
      return 'Friend Request Accepted';
    case 'friend_request_declined':
      return 'Friend Request Declined';
    case 'plan_invite':
      return 'Plan Invitation';
    case 'plan_invite_accepted':
      return 'Plan Invitation Accepted';
    case 'plan_invite_declined':
      return 'Plan Invitation Declined';
    case 'floq_invite':
      return 'Floq Invitation';
    case 'floq_invite_accepted':
      return 'Floq Invitation Accepted';
    case 'floq_invite_declined':
      return 'Floq Invitation Declined';
    // Momentary Floq notifications
    case 'momentary_floq_created':
    case 'friend_started_floq_nearby':
      return 'Momentary Floq Started';
    case 'momentary_floq_friend_joined':
      return 'Friend Joined Floq';
    case 'momentary_floq_nearby':
      return 'Floq Nearby';
    case 'wave_activity_friend':
      return 'Friend Activity';
    case 'plan_comment_new':
      return 'New Plan Comment';
    case 'plan_checkin':
      return 'Plan Check-in';
    case 'floq_reaction':
      return 'New Reaction';
    case 'floq_reply':
      return 'New Reply';
    default:
      return 'New Notification';
  }
};

const getNotificationSubtitle = (notification: any) => {
  switch (notification.kind) {
    case 'dm':
      return notification.payload?.preview || 'You have a new message';
    case 'friend_request':
      return 'Someone wants to be your friend';
    case 'friend_request_accepted':
      return 'Your friend request was accepted';
    case 'friend_request_declined':
      return 'Your friend request was declined';
    case 'plan_invite':
      return 'You\'ve been invited to a plan';
    case 'plan_invite_accepted':
      return 'Your plan invitation was accepted';
    case 'plan_invite_declined':
      return 'Your plan invitation was declined';
    case 'floq_invite':
      return 'You\'ve been invited to a floq';
    case 'floq_invite_accepted':
      return 'Your floq invitation was accepted';
    case 'floq_invite_declined':
      return 'Your floq invitation was declined';
    // Momentary Floq notifications
    case 'momentary_floq_created':
    case 'friend_started_floq_nearby':
      return 'A friend started a momentary floq nearby';
    case 'momentary_floq_friend_joined':
      return 'A friend joined your momentary floq';
    case 'momentary_floq_nearby':
      return 'There\'s a momentary floq happening near you';
    case 'wave_activity_friend':
      return 'Friends are gathering in a wave nearby';
    case 'plan_comment_new':
      return 'Someone commented on a plan';
    case 'plan_checkin':
      return 'Someone checked into a plan';
    case 'floq_reaction':
      return 'Someone reacted to a message';
    case 'floq_reply':
      return 'Someone replied to a message';
    default:
      return '';
  }
};

export const NotificationsList = () => {
  const { toast } = useToast();
  const { unseen: notifications, markAsSeen, markAllSeen } = useEventNotifications();
  const { handleNotificationTap } = useNotificationActions();

  const handleMarkAllAsRead = () => {
    markAllSeen();
    toast({
      title: "All notifications marked as read"
    });
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.seen_at) {
      handleNotificationTap(notification);
    }
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
          {notifications.map((notification) => {
            // Use enhanced component for momentary floq notifications
            const isMomentaryFloqNotification = [
              'momentary_floq_created',
              'momentary_floq_friend_joined', 
              'momentary_floq_nearby',
              'wave_activity_friend',
              'friend_started_floq_nearby'
            ].includes(notification.kind);

            if (isMomentaryFloqNotification) {
              return (
                <MomentaryFloqNotificationItem
                  key={notification.id}
                  notification={notification}
                  onTap={() => handleNotificationClick(notification)}
                  onMarkSeen={() => markAsSeen([notification.id])}
                />
              );
            }

            // Default notification rendering for other types
            return (
              <div
                key={notification.id}
                className={cn(
                  "max-w-full p-3 rounded-lg border transition-colors cursor-pointer",
                  notification.seen_at 
                    ? 'bg-muted/20 border-border/50' 
                    : 'bg-card border-border hover:bg-muted/30'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("flex-shrink-0 p-2 rounded-full", getNotificationColor(notification.kind))}>
                    {getNotificationIcon(notification.kind)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", 
                          notification.seen_at ? 'text-muted-foreground' : 'text-foreground'
                        )}>
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
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};