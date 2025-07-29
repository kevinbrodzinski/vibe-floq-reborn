import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

interface EventNotification {
  id: string;
  user_id: string;
  kind: string;
  payload: { plan_id?: string };
  created_at: string;
  seen_at?: string;
}

type PlanBadges = Record<string /*plan_id*/, number>;

interface Ctx {
  badges: PlanBadges;
  clearPlan: (planId: string) => void;
}

const PlanNotifCtx = createContext<Ctx | undefined>(undefined);

const LS_KEY = 'plan_badges_v1';

export const PlanNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<PlanBadges>(() => {
    // hydrate from localStorage once
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    } catch {
      return {};
    }
  });

  // persist whenever badges change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(badges));
  }, [badges]);

  // Subscribe to new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`plan-events:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        ({ new: row }) => {
          const notif = row as { kind: string; payload: { plan_id?: string } };
          if (
            notif.kind === 'plan_comment_new' ||
            notif.kind === 'plan_checkin'
          ) {
            const planId = notif.payload?.plan_id;
            if (!planId) return;
            setBadges(prev => ({ ...prev, [planId]: (prev[planId] || 0) + 1 }));
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
        ({ new: row }) => {
          const notification = row as EventNotification;
          if (notification.seen_at) {
            setBadges(prev => {
              if (notification.kind === 'plan_comment_new' || notification.kind === 'plan_checkin') {
                const planId = notification.payload?.plan_id;
                if (planId && prev[planId]) {
                  const newCount = Math.max(0, prev[planId] - 1);
                  if (newCount === 0) {
                    const { [planId]: _, ...rest } = prev;
                    return rest;
                  }
                  return { ...prev, [planId]: newCount };
                }
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const clearPlan = (planId: string) => {
    setBadges((prev) => {
      const { [planId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  return (
    <PlanNotifCtx.Provider value={{ badges, clearPlan }}>
      {children}
    </PlanNotifCtx.Provider>
  );
};

/* ---------- helper hook (internal) ---------- */
export function usePlanBadgeInternal() {
  const ctx = useContext(PlanNotifCtx);
  if (!ctx)
    throw new Error('usePlanBadge* hooks must be used inside <PlanNotificationProvider>');
  return ctx;
}