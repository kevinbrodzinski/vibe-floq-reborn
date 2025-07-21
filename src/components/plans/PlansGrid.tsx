
import React from 'react';
import { PlanCard } from './PlanCard';

interface PlansGridProps {
  plans: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    planned_at: string;
    created_at: string;
    floqs?: {
      title: string;
    };
  }>;
}

export const PlansGrid: React.FC<PlansGridProps> = ({ plans }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
};
