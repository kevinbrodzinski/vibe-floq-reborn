import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MessageCircle, Calendar, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { invalidateNotifications } from '@/hooks/useUnreadCounts';

interface Notification {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  floq_id?: string;
  message_id?: string;
  plan_id?: string;
  read_at?: string;
  created_at: string;
}

const getNotificationIcon = (kind: string) => {
  switch (kind) {
    case 'floq_mention':
      return <MessageCircle className="w-4 h-4" />;
    case 'plan_rsvp':
      return <Calendar className="w-4 h-4" />;
    case 'friend_request':
      return <Users className="w-4 h-4" />;
    case 'floq_invitation':
      return <Users className="w-4 h-4" />;
    case 'achievement_earned':
      return <Trophy className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationColor = (kind: string) => {
  switch (kind) {
    case 'floq_mention':
      return 'text-blue-500';
    case 'plan_rsvp':
      return 'text-green-500';
    case 'friend_request':
      return 'text-purple-500';
    case 'floq_invitation':
      return 'text-orange-500';
    case 'achievement_earned':
      return 'text-yellow-500';
    default:
      return 'text-muted-foreground';
  }
};

export const NotificationsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await supabase.rpc('mark_notifications_read', {
        notification_ids: notificationIds,
        mark_all_for_user: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications(queryClient, user?.id);
    },
    onError: (error) => {
      console.error('Error marking notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_notifications_read', {
        notification_ids: null,
        mark_all_for_user: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNotifications(queryClient, user?.id);
      toast({
        title: "All notifications marked as read"
      });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error", 
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  });

  const handleMarkAsRead = (notificationIds: string[]) => {
    markAsReadMutation.mutate(notificationIds);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground h-48">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No notifications yet</p>
        <p className="text-sm">You'll see new notifications here</p>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.read_at);

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
            disabled={markAllAsReadMutation.isPending}
            className="text-xs"
          >
            {markAllAsReadMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Marking...
              </>
            ) : (
              'Mark all read'
            )}
          </Button>
        </div>
      )}

      <ScrollArea className="max-h-96">
        <div className="space-y-2 px-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-colors ${
                notification.read_at 
                  ? 'bg-muted/20 border-border/50' 
                  : 'bg-card border-border cursor-pointer hover:bg-muted/30'
              }`}
              onClick={() => !notification.read_at && handleMarkAsRead([notification.id])}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${getNotificationColor(notification.kind)}`}>
                  {getNotificationIcon(notification.kind)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        notification.read_at ? 'text-muted-foreground' : 'text-foreground'
                      }`}>
                        {notification.title}
                      </p>
                      {notification.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.subtitle}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.read_at && (
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