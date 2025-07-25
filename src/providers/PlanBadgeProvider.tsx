import React, { createContext, useContext, ReactNode } from 'react';
import { useEventNotifications } from './EventNotificationsProvider';

export const PlanBadgeContext = createContext(0);

export function PlanBadgeProvider({ children }: { children: ReactNode }) {
  const { unseen } = useEventNotifications();
  const planBadge = unseen.filter(
    n => n.kind === 'plan_comment_new' || n.kind === 'plan_checkin'
  ).length;

  return (
    <PlanBadgeContext.Provider value={planBadge}>
      {children}
    </PlanBadgeContext.Provider>
  );
}

export const usePlanBadge = () => useContext(PlanBadgeContext);