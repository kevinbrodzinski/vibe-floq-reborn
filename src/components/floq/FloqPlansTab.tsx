
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFloqPlans } from '@/hooks/useFloqPlans';
import { PlanCard } from './PlanCard';
import { FloqPlanFAB } from '@/components/FloqPlanFAB';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqPlansTabProps {
  floqDetails: FloqDetails;
}

export const FloqPlansTab: React.FC<FloqPlansTabProps> = ({ floqDetails }) => {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = useFloqPlans(floqDetails.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Plans & Events
          </h3>
        </div>

        {/* Empty State */}
        <Card className="p-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No plans yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create the first plan for this floq to coordinate activities and meetups.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => navigate(`/floqs/${floqDetails.id}/plans/new`)}
            >
              <Plus className="h-4 w-4" />
              Create First Plan
            </Button>
          </div>
        </Card>

        {/* Quick Plan Templates */}
        <Card className="p-6">
          <h4 className="font-medium mb-4">Quick Plan Templates</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium text-sm">Coffee Meetup</div>
                <div className="text-xs text-muted-foreground">Casual coffee and chat</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium text-sm">Group Activity</div>
                <div className="text-xs text-muted-foreground">Organized group event</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium text-sm">Study Session</div>
                <div className="text-xs text-muted-foreground">Collaborative learning</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium text-sm">Custom Plan</div>
                <div className="text-xs text-muted-foreground">Create from scratch</div>
              </div>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Plans & Events
        </h3>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Floating Action Button */}
      <FloqPlanFAB floqId={floqDetails.id} />
    </div>
  );
};
