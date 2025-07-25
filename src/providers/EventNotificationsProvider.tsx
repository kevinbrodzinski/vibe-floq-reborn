import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

interface EventNotification {
  id: string;
  user_id: string;
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
}

const EventNotificationsContext = createContext<EventNotificationsContextType | undefined>(undefined);

const SUB_KINDS = [
  'dm',
  'friend_request',
  'friend_request_accepted', 
  'friend_request_declined',
  'plan_invite',
  'plan_invite_accepted',
  'plan_invite_declined',
  'floq_invite',
  'floq_invite_accepted',
  'floq_invite_declined',
  'plan_comment_new',
  'plan_checkin',
  'floq_reaction',
  'floq_reply',
] as const;

export const EventNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unseen, setUnseen] = useState<EventNotification[]>([]);

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
        .eq('user_id', user.id)
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

  // Subscribe to new notifications
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
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as EventNotification;
          // Double-check user_id for security
          if (notification.user_id === user.id && SUB_KINDS.includes(notification.kind as any)) {
            setUnseen(prev => [notification, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as EventNotification;
          // Double-check user_id for security
          if (notification.user_id === user.id && notification.seen_at) {
            setUnseen(prev => prev.filter(n => n.id !== notification.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsSeen = async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    const { error } = await supabase
      .from('event_notifications' as any)
      .update({ seen_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notifications as seen:', error);
    }
  };

  const markAllSeen = async (kinds?: string[]) => {
    if (!user) return;

    let query = supabase
      .from('event_notifications' as any)
      .update({ seen_at: new Date().toISOString() })
      .eq('user_id', user.id)
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

  return (
    <EventNotificationsContext.Provider value={{ unseen, markAsSeen, markAllSeen, getCountByPlan, getTotalPlanBadges, clearPlan }}>
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