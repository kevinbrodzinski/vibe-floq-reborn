import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { pushNotificationService } from '@/lib/pushNotifications';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  dm: boolean;
  friend_requests: boolean;
  plan_invites: boolean;
  floq_invites: boolean;
  mentions: boolean;
  reactions: boolean;
  achievements: boolean;
  system: boolean;
}

interface NotificationStats {
  totalUnread: number;
  dmCount: number;
  friendRequestCount: number;
  planCount: number;
  floqCount: number;
  achievementCount: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { unseen, totalUnreadCount, markAsSeen, markAllSeen } = useEventNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    dm: true,
    friend_requests: true,
    plan_invites: true,
    floq_invites: true,
    mentions: true,
    reactions: true,
    achievements: true,
    system: true,
  });

  // Request notification permissions on first use
  useEffect(() => {
    const requestPermissions = async () => {
      if (!user) return;
      
      // Request browser notification permission
      if (pushNotificationService.getSupported() && !pushNotificationService.isPermissionGranted()) {
        const granted = await pushNotificationService.requestPermission();
        if (granted) {
          toast({
            title: "Notifications enabled! 🔔",
            description: "You'll now receive real-time notifications",
            duration: 4000,
          });
        }
      }
    };

    requestPermissions();
  }, [user, toast]);

  // Subscribe to mention notifications from floq_message_mentions table
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('mention_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_message_mentions',
          filter: `target_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            // Only handle user mentions
            if (payload.new.target_type !== 'user') return;
            
            // Fetch additional details about the mention
            const { data: mentionDetails } = await supabase
              .from('floq_message_mentions')
              .select(`
                *,
                floq_messages!message_id(
                  body,
                  sender_id,
                  floq_id,
                  sender:profiles!floq_messages_sender_id_fkey(username),
                  floqs!floq_id(name)
                )
              `)
              .eq('message_id', payload.new.message_id)
              .eq('target_id', user.id)
              .single();

            if (mentionDetails?.floq_messages) {
              const message = mentionDetails.floq_messages;
              const senderName = message.sender?.username || 'Someone';
              const floqName = message.floqs?.name || 'a floq';

              // Create a notification entry in event_notifications table
              await supabase.from('event_notifications').insert({
                profile_id: user.id,
                kind: 'floq_mention',
                payload: {
                  message_id: payload.new.message_id,
                  floq_id: message.floq_id,
                  sender_id: message.sender_id,
                  sender_name: senderName,
                  floq_name: floqName,
                  preview: message.body?.substring(0, 100) || '',
                  custom_message: `${senderName} mentioned you in ${floqName}`,
                }
              });
            }
          } catch (error) {
            console.error('Error processing mention notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Calculate notification stats
  const getNotificationStats = (): NotificationStats => {
    const dmCount = unseen.filter(n => n.kind === 'dm').length;
    const friendRequestCount = unseen.filter(n => n.kind === 'friend_request').length;
    const planCount = unseen.filter(n => 
      ['plan_invite', 'plan_comment_new', 'plan_checkin', 'plan_updated', 'plan_reminder'].includes(n.kind)
    ).length;
    const floqCount = unseen.filter(n => 
      ['floq_invite', 'floq_mention', 'floq_reaction', 'floq_reply', 'floq_joined'].includes(n.kind)
    ).length;
    const achievementCount = unseen.filter(n => 
      ['achievement_unlocked', 'streak_milestone', 'afterglow_ready'].includes(n.kind)
    ).length;

    return {
      totalUnread: totalUnreadCount,
      dmCount,
      friendRequestCount,
      planCount,
      floqCount,
      achievementCount,
    };
  };

  // Update notification preferences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;

    setPreferences(prev => ({ ...prev, ...newPreferences }));

    try {
      // Store preferences in user profile or settings table
      await supabase
        .from('profiles')
        .update({ 
          notification_preferences: { ...preferences, ...newPreferences } 
        })
        .eq('id', user.id);

      toast({
        title: "Notification preferences updated",
        description: "Your settings have been saved",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Error updating preferences",
        description: "Please try again later",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Mark specific notification types as read
  const markTypeAsRead = async (notificationTypes: string[]) => {
    const typeNotifications = unseen.filter(n => notificationTypes.includes(n.kind));
    if (typeNotifications.length > 0) {
      await markAsSeen(typeNotifications.map(n => n.id));
      
      toast({
        title: `Marked ${typeNotifications.length} notifications as read`,
        duration: 2000,
      });
    }
  };

  // Test notification system
  const testNotification = async (type: string = 'system_announcement') => {
    if (!user) return;

    try {
      await supabase.from('event_notifications').insert({
        profile_id: user.id,
        kind: type,
        payload: {
          custom_message: 'This is a test notification to verify your notification system is working correctly.',
          test: true,
        }
      });

      toast({
        title: "Test notification sent! 🧪",
        description: "Check your notifications panel",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test notification failed",
        description: "There was an error sending the test notification",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Get notifications by category
  const getNotificationsByCategory = () => {
    const categories = {
      social: unseen.filter(n => ['dm', 'friend_request', 'friend_request_accepted', 'friend_request_declined'].includes(n.kind)),
      plans: unseen.filter(n => ['plan_invite', 'plan_comment_new', 'plan_checkin', 'plan_updated', 'plan_reminder', 'plan_cancelled'].includes(n.kind)),
      floqs: unseen.filter(n => ['floq_invite', 'floq_mention', 'floq_reaction', 'floq_reply', 'floq_joined', 'floq_left'].includes(n.kind)),
      achievements: unseen.filter(n => ['achievement_unlocked', 'streak_milestone', 'afterglow_ready', 'weekly_recap'].includes(n.kind)),
      location: unseen.filter(n => ['venue_suggestion', 'friend_nearby', 'popular_venue_alert'].includes(n.kind)),
      system: unseen.filter(n => ['system_announcement', 'feature_update'].includes(n.kind)),
    };

    return categories;
  };

  return {
    // Core data
    notifications: unseen,
    stats: getNotificationStats(),
    preferences,
    
    // Actions
    markAsSeen,
    markAllSeen,
    markTypeAsRead,
    updatePreferences,
    testNotification,
    
    // Utilities
    getNotificationsByCategory,
    
    // Permission status
    hasPermission: pushNotificationService.isPermissionGranted(),
    isSupported: pushNotificationService.getSupported(),
  };
}