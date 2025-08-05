import { usePlanBadgeInternal } from '@/providers/PlanNotificationProvider';

/** returns the unread count for a given plan_id  */
export function usePlanBadge(planId: string): number {
  const { badges } = usePlanBadgeInternal();
  return badges[planId] || 0;
}

/** call when the user opens the plan so badge resets to 0 */
export function useClearPlanBadge() {
  return usePlanBadgeInternal().clearPlan;
}

/** total badges across all plans – handy for tab-level red dot */
export function useTotalPlanBadges(): number {
  const { badges } = usePlanBadgeInternal();
  return Object.values(badges).reduce((sum, n) => sum + n, 0);
}