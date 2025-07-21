
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, MapPin, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFloqPlans } from '@/hooks/useFloqPlans';
import { PlanCard } from '@/components/plans/PlanCard';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqPlansTabProps {
  floqDetails: FloqDetails;
}

export const FloqPlansTab: React.FC<FloqPlansTabProps> = ({ floqDetails }) => {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = useFloqPlans(floqDetails.id);

  const handleCreatePlan = (templateType?: string) => {
    navigate('/plan/new', { 
      state: { 
        floqId: floqDetails.id,
        floqTitle: floqDetails.title,
        templateType 
      } 
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          Plans & Events
        </h3>
        <Button size="sm" className="flex items-center gap-1 text-xs px-3 py-1 h-8" onClick={() => handleCreatePlan()}>
          <Plus className="h-3 w-3" />
          <span className="hidden xs:inline">Create Plan</span>
          <span className="xs:hidden">Create</span>
        </Button>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </Card>
        ) : plans.length === 0 ? (
          <Card className="p-4">
            <div className="text-center py-6">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h4 className="font-medium text-base mb-1">No plans yet</h4>
              <p className="text-sm text-muted-foreground mb-3 px-2">
                Create the first plan for this floq to coordinate activities and meetups.
              </p>
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs px-3 py-1 h-8 mx-auto" onClick={() => handleCreatePlan()}>
                <Plus className="h-3 w-3" />
                Create First Plan
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Plan Templates */}
      <Card className="p-4">
        <h4 className="font-medium text-base mb-3">Quick Plan Templates</h4>
        <div className="grid grid-cols-1 gap-2">
          <Button 
            variant="outline" 
            className="justify-start h-auto p-3 text-left"
            onClick={() => handleCreatePlan('coffee')}
          >
            <div className="w-full">
              <div className="font-medium text-sm">Coffee Meetup</div>
              <div className="text-xs text-muted-foreground">Casual coffee and chat</div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="justify-start h-auto p-3 text-left"
            onClick={() => handleCreatePlan('activity')}
          >
            <div className="w-full">
              <div className="font-medium text-sm">Group Activity</div>
              <div className="text-xs text-muted-foreground">Organized group event</div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="justify-start h-auto p-3 text-left"
            onClick={() => handleCreatePlan('study')}
          >
            <div className="w-full">
              <div className="font-medium text-sm">Study Session</div>
              <div className="text-xs text-muted-foreground">Collaborative learning</div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="justify-start h-auto p-3 text-left"
            onClick={() => handleCreatePlan('custom')}
          >
            <div className="w-full">
              <div className="font-medium text-sm">Custom Plan</div>
              <div className="text-xs text-muted-foreground">Create from scratch</div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
};
