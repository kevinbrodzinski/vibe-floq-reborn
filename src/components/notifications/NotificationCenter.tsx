import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellOff, Check, Clock, MessageSquare, UserPlus, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  profile_id: string;
  kind: string;
  payload: any;
  seen_at: string | null;
  created_at: string;
}

const NOTIFICATION_ICONS = {
  dm: MessageSquare,
  dm_reaction: MessageSquare,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
  plan_invite: Calendar,
  floq_invite: Calendar,
  serendipity_match: Sparkles,
  venue_activity: Bell
};

const NOTIFICATION_COLORS = {
  dm: 'text-blue-500',
  dm_reaction: 'text-blue-500',
  friend_request: 'text-green-500',
  friend_accepted: 'text-green-500',
  plan_invite: 'text-purple-500',
  floq_invite: 'text-purple-500',
  serendipity_match: 'text-orange-500',
  venue_activity: 'text-cyan-500'
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('event_notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get unread count
  const unreadCount = notifications.filter(n => !n.seen_at).length;

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('event_notifications')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', notificationId);

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('event_notifications')
        .update({ seen_at: new Date().toISOString() })
        .eq('profile_id', user.id)
        .is('seen_at', null);

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.kind) {
      case 'dm':
      case 'dm_reaction':
        if (notification.payload?.thread_id) {
          navigate(`/dm/${notification.payload.thread_id}`);
        }
        break;
      case 'friend_request':
        navigate('/friends');
        break;
      case 'plan_invite':
        if (notification.payload?.plan_id) {
          navigate(`/plan/${notification.payload.plan_id}`);
        }
        break;
      case 'floq_invite':
        if (notification.payload?.floq_id) {
          navigate(`/floq/${notification.payload.floq_id}`);
        }
        break;
      case 'serendipity_match':
        navigate('/serendipity');
        break;
      default:
        break;
    }
    setIsOpen(false);
  };

  // Format notification text
  const getNotificationText = (notification: Notification) => {
    switch (notification.kind) {
      case 'dm':
        return 'New direct message';
      case 'dm_reaction':
        return `Reacted with ${notification.payload?.emoji || '👍'}`;
      case 'friend_request':
        return 'New friend request';
      case 'friend_accepted':
        return 'Friend request accepted';
      case 'plan_invite':
        return 'Invited to a plan';
      case 'floq_invite':
        return 'Invited to a floq';
      case 'serendipity_match':
        return 'New serendipity match found!';
      case 'venue_activity':
        return 'Activity at a venue you love';
      default:
        return 'New notification';
    }
  };

  return (
    <div className="relative">
      {/* Notification bell button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification panel */}
      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 max-h-96">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-64">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const Icon = NOTIFICATION_ICONS[notification.kind as keyof typeof NOTIFICATION_ICONS] || Bell;
                    const iconColor = NOTIFICATION_COLORS[notification.kind as keyof typeof NOTIFICATION_COLORS] || 'text-muted-foreground';
                    
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                          !notification.seen_at && 'bg-primary/5 border-l-2 border-l-primary'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconColor)} />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm',
                              !notification.seen_at && 'font-medium'
                            )}>
                              {getNotificationText(notification)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          {!notification.seen_at && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}