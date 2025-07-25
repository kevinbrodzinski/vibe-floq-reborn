import React from 'react';
import { useTotalPlanBadges } from '@/hooks/usePlanBadge';
import { Badge } from '@/components/ui/badge';

export const PlansHubBadge: React.FC = () => {
  const total = useTotalPlanBadges();
  if (!total) return null;

  return (
    <Badge
      variant="destructive"
      className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full"
      aria-label="unread plan activity">
      {total}
    </Badge>
  );
};