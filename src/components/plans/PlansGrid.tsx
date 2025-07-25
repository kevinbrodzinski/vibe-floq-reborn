
import React from 'react';
import { PlanCard } from './PlanCardLarge';
import { PlanStatus } from '@/types/enums/planStatus';
import { motion } from 'framer-motion';

interface PlansGridProps {
  plans: Array<{
    id: string;
    title: string;
    description?: string;
    status: PlanStatus;
    planned_at: string;
    created_at: string;
    creator_id: string;
    floqs?: {
      title: string;
    };
  }>;
}

export const PlansGrid: React.FC<PlansGridProps> = ({ plans }) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: index * 0.1,
            ease: "easeOut"
          }}
          className="w-full"
        >
          <PlanCard plan={plan} />
        </motion.div>
      ))}
    </div>
  );
};
