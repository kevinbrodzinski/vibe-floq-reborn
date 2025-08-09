import React from 'react';
import { 
  Bell, MessageCircle, UserPlus, UserCheck, UserX, Calendar, MapPin, Heart, Reply, 
  Trophy, Sparkles, Users, MapPinned, Megaphone, Settings, Clock, CheckCircle,
  MessageSquare, UserMinus, Star, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotificationActions } from '@/hooks/useNotificationActions';

const getNotificationIcon = (kind: string) => {
  switch (kind) {
    // Core social notifications
    case 'dm':
      return <MessageCircle className="w-4 h-4" />;
    case 'friend_request':
      return <UserPlus className="w-4 h-4" />;
    case 'friend_request_accepted':
      return <UserCheck className="w-4 h-4" />;
    case 'friend_request_declined':
      return <UserX className="w-4 h-4" />;
    
    // Plan notifications
    case 'plan_invite':
    case 'plan_invite_accepted':
    case 'plan_invite_declined':
      return <Calendar className="w-4 h-4" />;
    case 'plan_comment_new':
      return <MessageSquare className="w-4 h-4" />;
    case 'plan_checkin':
      return <CheckCircle className="w-4 h-4" />;
    case 'plan_updated':
      return <Settings className="w-4 h-4" />;
    case 'plan_cancelled':
      return <UserX className="w-4 h-4" />;
    case 'plan_reminder':
      return <Clock className="w-4 h-4" />;
    
    // Floq notifications
    case 'floq_invite':
    case 'floq_invite_accepted':
    case 'floq_invite_declined':
      return <MapPin className="w-4 h-4" />;
    case 'floq_reaction':
      return <Heart className="w-4 h-4" />;
    case 'floq_reply':
      return <Reply className="w-4 h-4" />;
    case 'floq_mention':
      return <MessageCircle className="w-4 h-4" />;
    case 'floq_joined':
      return <Users className="w-4 h-4" />;
    case 'floq_left':
      return <UserMinus className="w-4 h-4" />;
    
    // Achievement & social notifications
    case 'achievement_unlocked':
      return <Trophy className="w-4 h-4" />;
    case 'streak_milestone':
      return <Star className="w-4 h-4" />;
    case 'weekly_recap':
      return <Calendar className="w-4 h-4" />;
    case 'afterglow_ready':
      return <Sparkles className="w-4 h-4" />;
    
    // Venue & location notifications
    case 'venue_suggestion':
      return <MapPinned className="w-4 h-4" />;
    case 'friend_nearby':
      return <Navigation className="w-4 h-4" />;
    case 'popular_venue_alert':
      return <MapPin className="w-4 h-4" />;
    
    // System notifications
    case 'system_announcement':
      return <Megaphone className="w-4 h-4" />;
    case 'feature_update':
      return <Settings className="w-4 h-4" />;
    
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationColor = (kind: string) => {
  switch (kind) {
    // Core social notifications
    case 'dm':
    case 'floq_mention':
      return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
    case 'friend_request':
    case 'friend_request_accepted':
      return 'text-green-500 bg-green-50 dark:bg-green-950/20';
    case 'friend_request_declined':
      return 'text-red-500 bg-red-50 dark:bg-red-950/20';
    
    // Plan notifications
    case 'plan_invite':
    case 'plan_invite_accepted':
    case 'plan_invite_declined':
    case 'plan_comment_new':
    case 'plan_checkin':
    case 'plan_updated':
    case 'plan_reminder':
      return 'text-purple-500 bg-purple-50 dark:bg-purple-950/20';
    case 'plan_cancelled':
      return 'text-red-500 bg-red-50 dark:bg-red-950/20';
    
    // Floq notifications
    case 'floq_invite':
    case 'floq_invite_accepted':
    case 'floq_invite_declined':
    case 'floq_joined':
    case 'venue_suggestion':
    case 'popular_venue_alert':
      return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20';
    case 'floq_reaction':
      return 'text-pink-500 bg-pink-50 dark:bg-pink-950/20';
    case 'floq_reply':
      return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20';
    case 'floq_left':
      return 'text-gray-500 bg-gray-50 dark:bg-gray-950/20';
    
    // Achievement & social notifications
    case 'achievement_unlocked':
    case 'streak_milestone':
      return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    case 'afterglow_ready':
      return 'text-violet-500 bg-violet-50 dark:bg-violet-950/20';
    case 'weekly_recap':
      return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20';
    
    // Location notifications
    case 'friend_nearby':
      return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
    
    // System notifications
    case 'system_announcement':
    case 'feature_update':
      return 'text-slate-500 bg-slate-50 dark:bg-slate-950/20';
    
    default:
      return 'text-gray-500 bg-gray-50 dark:bg-gray-950/20';
  }
};

const getNotificationTitle = (notification: any) => {
  const senderName = notification.payload?.sender_name || notification.payload?.from_username || 'Someone';
  const planName = notification.payload?.plan_name || 'a plan';
  const floqName = notification.payload?.floq_name || 'a floq';
  
  switch (notification.kind) {
    // Core social notifications
    case 'dm':
      return `New message from ${senderName}`;
    case 'friend_request':
      return `Friend request from ${senderName}`;
    case 'friend_request_accepted':
      return `${senderName} accepted your friend request`;
    case 'friend_request_declined':
      return `${senderName} declined your friend request`;
    
    // Plan notifications
    case 'plan_invite':
      return `Invited to ${planName}`;
    case 'plan_invite_accepted':
      return `${senderName} accepted your plan invite`;
    case 'plan_invite_declined':
      return `${senderName} declined your plan invite`;
    case 'plan_comment_new':
      return `New comment on ${planName}`;
    case 'plan_checkin':
      return `${senderName} checked into ${planName}`;
    case 'plan_updated':
      return `${planName} was updated`;
    case 'plan_cancelled':
      return `${planName} was cancelled`;
    case 'plan_reminder':
      return `Reminder: ${planName} starts soon`;
    
    // Floq notifications
    case 'floq_invite':
      return `Invited to ${floqName}`;
    case 'floq_invite_accepted':
      return `${senderName} joined ${floqName}`;
    case 'floq_invite_declined':
      return `${senderName} declined your floq invite`;
    case 'floq_reaction':
      return `${senderName} reacted to your message`;
    case 'floq_reply':
      return `${senderName} replied to you`;
    case 'floq_mention':
      return `${senderName} mentioned you`;
    case 'floq_joined':
      return `${senderName} joined ${floqName}`;
    case 'floq_left':
      return `${senderName} left ${floqName}`;
    
    // Achievement & social notifications
    case 'achievement_unlocked':
      return `Achievement Unlocked! 🏆`;
    case 'streak_milestone':
      return `${notification.payload?.streak_days || 7}-day streak milestone!`;
    case 'weekly_recap':
      return `Your weekly recap is ready`;
    case 'afterglow_ready':
      return `Your afterglow is ready ✨`;
    
    // Venue & location notifications
    case 'venue_suggestion':
      return `New venue suggestion`;
    case 'friend_nearby':
      return `${senderName} is nearby`;
    case 'popular_venue_alert':
      return `${notification.payload?.venue_name || 'A venue'} is trending nearby`;
    
    // System notifications
    case 'system_announcement':
      return `System announcement`;
    case 'feature_update':
      return `New feature available`;
    
    default:
      return 'New Notification';
  }
};

const getNotificationSubtitle = (notification: any) => {
  const preview = notification.payload?.preview || notification.payload?.message;
  const location = notification.payload?.location_name;
  
  switch (notification.kind) {
    case 'dm':
      return preview || 'You have a new message';
    case 'friend_request':
      return 'Someone wants to be your friend';
    case 'friend_request_accepted':
      return 'You can now message each other';
    case 'friend_request_declined':
      return 'Your friend request was not accepted';
    case 'plan_invite':
      return `${notification.payload?.plan_description || 'Join this plan'}`;
    case 'plan_invite_accepted':
      return 'They\'re excited to join your plan!';
    case 'plan_invite_declined':
      return 'They won\'t be joining this time';
    case 'floq_invite':
      return `Join the conversation${location ? ` at ${location}` : ''}`;
    case 'floq_invite_accepted':
      return 'They joined the floq!';
    case 'floq_invite_declined':
      return 'They declined to join';
    case 'plan_comment_new':
      return preview || 'Someone commented on a plan';
    case 'plan_checkin':
      return `${location ? `Checked in at ${location}` : 'Someone checked into a plan'}`;
    case 'plan_updated':
      return 'Check out the latest changes';
    case 'plan_cancelled':
      return 'This plan has been cancelled';
    case 'plan_reminder':
      return `Starting in ${notification.payload?.time_until || '30 minutes'}`;
    case 'floq_reaction':
      return `Reacted with ${notification.payload?.reaction || '❤️'}`;
    case 'floq_reply':
      return preview || 'Someone replied to your message';
    case 'floq_mention':
      return preview || 'You were mentioned in a conversation';
    case 'floq_joined':
      return 'A new person joined the conversation';
    case 'floq_left':
      return 'Someone left the conversation';
    case 'achievement_unlocked':
      return notification.payload?.achievement_name || 'You earned a new achievement';
    case 'streak_milestone':
      return `Keep it up! You're on a roll 🔥`;
    case 'weekly_recap':
      return 'See your week\'s highlights and stats';
    case 'afterglow_ready':
      return 'Your plan recap with photos and memories';
    case 'venue_suggestion':
      return `Check out ${notification.payload?.venue_name || 'this new place'}`;
    case 'friend_nearby':
      return `${location ? `Near ${location}` : 'Close to your location'}`;
    case 'popular_venue_alert':
      return `${notification.payload?.venue_name || 'A venue'} is trending nearby`;
    case 'system_announcement':
      return preview || 'Important update from the Floq team';
    case 'feature_update':
      return preview || 'New features and improvements available';
    default:
      return preview || '';
  }
};

export const NotificationsList = () => {
  const { toast } = useToast();
  const { unseen: notifications, markAsSeen, markAllSeen } = useEventNotifications();
  const { handleNotificationTap } = useNotificationActions();

  const handleMarkAllAsRead = () => {
    markAllSeen();
    toast({
      title: "All notifications marked as read",
      description: `Marked ${notifications.length} notifications as read`
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
        <p className="font-medium">No notifications yet</p>
        <p className="text-sm mt-1">You'll see new notifications here when they arrive</p>
        <div className="mt-4 text-xs text-muted-foreground/70">
          Messages • Friend requests • Plan invites • And more
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.seen_at);

  return (
    <div className="space-y-4">
      {unreadNotifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {unreadNotifications.length} unread notification{unreadNotifications.length === 1 ? '' : 's'}
            </span>
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {unreadNotifications.length}
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="text-xs h-7"
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
              className={cn(
                "max-w-full p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm",
                notification.seen_at 
                  ? 'bg-muted/20 border-border/50 opacity-75' 
                  : 'bg-card border-border hover:bg-muted/30 hover:border-border/80'
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 p-2 rounded-full transition-colors",
                  getNotificationColor(notification.kind)
                )}>
                  {getNotificationIcon(notification.kind)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium leading-tight", 
                        notification.seen_at ? 'text-muted-foreground' : 'text-foreground'
                      )}>
                        {getNotificationTitle(notification)}
                      </p>
                      {getNotificationSubtitle(notification) && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {getNotificationSubtitle(notification)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.seen_at && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
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