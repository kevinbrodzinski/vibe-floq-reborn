import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

type PlanBadges = Record<string /*plan_id*/, number>;

interface Ctx {
  badges: PlanBadges;
  clearPlan: (planId: string) => void;
}

const PlanNotifCtx = createContext<Ctx | undefined>(undefined);

const LS_KEY = 'plan_badges_v1';

export const PlanNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // realtime subscription
  const channelRef = useRef<ReturnType<typeof supabase.channel>>();

  useEffect(() => {
    const channel = supabase
      .channel('plan-events')
      .on<RealtimePostgresInsertPayload<{
        kind: string;
        payload: { plan_id: string };
        user_id: string;
      }>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_notifications',
          filter: 'kind=in.(plan_comment_new,plan_checkin)',
        },
        (payload) => {
          // payload.new has the notification data
          const notification = payload.new as any;
          const planId = notification.payload?.plan_id;
          if (!planId) return;

          setBadges((prev) => ({
            ...prev,
            [planId]: (prev[planId] || 0) + 1,
          }));
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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