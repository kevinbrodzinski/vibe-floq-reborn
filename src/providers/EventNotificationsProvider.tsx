import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { pushNotificationService } from '@/lib/pushNotifications';
import throttle from 'lodash.throttle';

interface EventNotification {
  id: string;
  profile_id: string;
  kind: string;
  payload: any;
  created_at: string;
  seen_at?: string;
}

interface EventNotificationsContextType {
  unseen: EventNotification[];
  markAsSeen: (ids: string[]) => void;
  markAllSeen: (kinds?: string[]) => void;
  getCountByPlan: (planId: string) => number;
  getTotalPlanBadges: () => number;
  clearPlan: (planId: string) => void;
  totalUnreadCount: number;
}

const EventNotificationsContext = createContext<EventNotificationsContextType | undefined>(undefined);

// Expanded notification types for comprehensive coverage
const SUB_KINDS = [
  // Core social notifications
  'dm',
  'friend_request',
  'friend_request_accepted',
  'friend_request_declined',
  
  // Plan notifications
  'plan_invite',
  'plan_invite_accepted',
  'plan_invite_declined',
  'plan_comment_new',
  'plan_checkin',
  'plan_updated',
  'plan_cancelled',
  'plan_reminder',
  
  // Floq notifications
  'floq_invite',
  'floq_invite_accepted',
  'floq_invite_declined',
  'floq_reaction',
  'floq_reply',
  'floq_mention',
  'floq_joined',
  'floq_left',
  
  // Achievement & social notifications
  'achievement_unlocked',
  'streak_milestone',
  'weekly_recap',
  'afterglow_ready',
  
  // Venue & location notifications
  'venue_suggestion',
  'friend_nearby',
  'popular_venue_alert',
  
  // System notifications
  'system_announcement',
  'feature_update',
] as const;

// Notification display configurations
const getNotificationConfig = (kind: string) => {
  const configs: Record<string, { title: string; description: string; action?: string }> = {
    'dm': { 
      title: "New Message", 
      description: "You have a new direct message",
      action: 'open_dm'
    },
    'friend_request': { 
      title: "Friend Request", 
      description: "You have a new friend request",
      action: 'open_friend_requests'
    },
    'friend_request_accepted': { 
      title: "Friend Request Accepted", 
      description: "Your friend request was accepted 🎉" 
    },
    'friend_request_declined': { 
      title: "Friend Request Declined", 
      description: "Your friend request was declined" 
    },
    'plan_invite': { 
      title: "Plan Invitation", 
      description: "You've been invited to a plan",
      action: 'open_plan'
    },
    'plan_invite_accepted': { 
      title: "Plan Invitation Accepted", 
      description: "Your plan invitation was accepted 🎉" 
    },
    'plan_invite_declined': { 
      title: "Plan Invitation Declined", 
      description: "Your plan invitation was declined" 
    },
    'floq_invite': { 
      title: "Floq Invitation", 
      description: "You've been invited to join a floq",
      action: 'open_floq'
    },
    'floq_invite_accepted': { 
      title: "Floq Invitation Accepted", 
      description: "Your floq invitation was accepted 🎉" 
    },
    'floq_invite_declined': { 
      title: "Floq Invitation Declined", 
      description: "Your floq invitation was declined" 
    },
    'floq_mention': {
      title: "You were mentioned",
      description: "Someone mentioned you in a floq",
      action: 'open_floq'
    },
    'floq_reaction': {
      title: "New Reaction",
      description: "Someone reacted to your message",
      action: 'open_floq'
    },
    'floq_reply': {
      title: "New Reply",
      description: "Someone replied to your message",
      action: 'open_floq'
    },
    'plan_comment_new': {
      title: "New Plan Comment",
      description: "Someone commented on a plan",
      action: 'open_plan'
    },
    'plan_checkin': {
      title: "Plan Check-in",
      description: "Someone checked into a plan",
      action: 'open_plan'
    },
    'achievement_unlocked': {
      title: "Achievement Unlocked! 🏆",
      description: "You've earned a new achievement"
    },
    'afterglow_ready': {
      title: "Your Afterglow is Ready ✨",
      description: "Check out your plan recap"
    },
    'friend_nearby': {
      title: "Friend Nearby 📍",
      description: "A friend is close to your location"
    }
  };
  
  return configs[kind] || { 
    title: "New Notification", 
    description: "You have a new notification" 
  };
};

export const EventNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [unseen, setUnseen] = useState<EventNotification[]>([]);

  // Stable throttled function to invalidate notification counts  
  const throttledInvalidateNotifications = React.useMemo(
    () => {
      const throttledFn = throttle(() => {
        if (user?.id) {
          queryClient.invalidateQueries({ 
            queryKey: ['notification-count', user.id],
            exact: true 
          });
        }
      }, 500);
      
      return () => throttledFn();
    },
    [user?.id, queryClient]
  );

  // Show notification toast and push notification
  const showNotification = React.useCallback(async (notification: EventNotification) => {
    const config = getNotificationConfig(notification.kind);
    
    // Show toast notification
    toast({
      title: config.title,
      description: notification.payload?.custom_message || config.description,
      duration: 5000,
    });

    // Show browser push notification if permission granted
    if (pushNotificationService.isPermissionGranted()) {
      await pushNotificationService.showNotification({
        title: config.title,
        body: notification.payload?.custom_message || config.description,
        tag: notification.kind,
        data: {
          action: config.action,
          notificationId: notification.id,
          ...notification.payload
        }
      });
    }

    // Vibrate on mobile (if supported)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [toast]);

  // Load initial unseen notifications
  useEffect(() => {
    if (!user) {
      setUnseen([]);
      return;
    }

    const loadUnseen = async () => {
      const { data, error } = await supabase
        .from('event_notifications' as any)
        .select('*')
        .eq('profile_id', user.id)
        .is('seen_at', null)
        .in('kind', SUB_KINDS)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setUnseen((data as unknown as EventNotification[]) || []);
    };

    loadUnseen();
  }, [user]);

  // Subscribe to new notifications with enhanced real-time features
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('event_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as EventNotification;
          if (notification.profile_id === user.id && SUB_KINDS.includes(notification.kind as any)) {
            setUnseen(prev => [notification, ...prev]);
            throttledInvalidateNotifications();
            
            // Show notification immediately
            await showNotification(notification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as EventNotification;
          if (notification.profile_id === user.id && notification.seen_at) {
            setUnseen(prev => prev.filter(n => n.id !== notification.id));
            throttledInvalidateNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user, throttledInvalidateNotifications, showNotification]);

  const markAsSeen = async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    const { error } = await supabase
      .from('event_notifications' as any)
      .update({ seen_at: new Date().toISOString() })
      .in('id', ids)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Error marking notifications as seen:', error);
    }
  };

  const markAllSeen = async (kinds?: string[]) => {
    if (!user) return;

    let query = supabase
      .from('event_notifications' as any)
      .update({ seen_at: new Date().toISOString() })
      .eq('profile_id', user.id)
      .is('seen_at', null);

    if (kinds) {
      query = query.in('kind', kinds);
    }

    const { error } = await query;

    if (error) {
      console.error('Error marking all notifications as seen:', error);
    }
  };

  const getCountByPlan = (planId: string) =>
    unseen.filter(n => n.payload?.plan_id === planId && (n.kind === 'plan_comment_new' || n.kind === 'plan_checkin')).length;

  const getTotalPlanBadges = () =>
    unseen.filter(n => n.kind === 'plan_comment_new' || n.kind === 'plan_checkin').length;

  const clearPlan = async (planId: string) => {
    if (!user) return;
    
    const planNotifications = unseen.filter(n => 
      n.payload?.plan_id === planId && (n.kind === 'plan_comment_new' || n.kind === 'plan_checkin')
    );
    
    if (planNotifications.length > 0) {
      await markAsSeen(planNotifications.map(n => n.id));
    }
  };

  // Calculate total unread count
  const totalUnreadCount = unseen.length;

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    unseen, 
    markAsSeen, 
    markAllSeen, 
    getCountByPlan, 
    getTotalPlanBadges, 
    clearPlan,
    totalUnreadCount
  }), [unseen, markAsSeen, markAllSeen, getCountByPlan, getTotalPlanBadges, clearPlan, totalUnreadCount]);

  return (
    <EventNotificationsContext.Provider value={contextValue}>
      {children}
    </EventNotificationsContext.Provider>
  );
};

export const useEventNotifications = () => {
  const context = useContext(EventNotificationsContext);
  if (!context) {
    throw new Error('useEventNotifications must be used within EventNotificationsProvider');
  }
  return context;
};