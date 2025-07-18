
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqPlansTabProps {
  floqDetails: FloqDetails;
}

export const FloqPlansTab: React.FC<FloqPlansTabProps> = ({ floqDetails }) => {
  const navigate = useNavigate();
  const [quickIdeas, setQuickIdeas] = useState(false);

  const startTemplate = (templateName: string) => {
    // Navigate to plan creation with template name as query param
    navigate(`/floqs/${floqDetails.id}/plans/new?template=${encodeURIComponent(templateName)}`);
  };

  // Mock plans data - replace with actual useFloqPlans hook when implemented
  const plans: any[] = [];
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <Card className="space-y-4 p-6 text-center">
        <h3 className="text-xl font-semibold">Plans</h3>
        <p className="text-sm text-muted-foreground">
          Coordinate activities and future meet-ups
        </p>

        {/* single CTA */}
        <Button
          variant="default"
          className="mx-auto"
          onClick={() => navigate(`/floqs/${floqDetails.id}/plans/new`)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create a plan
        </Button>

        {/* optional quick ideas – invisible until you toggle the flag */}
        {quickIdeas && (
          <div className="pt-4 space-y-2 text-left">
            <h4 className="text-sm font-medium text-muted-foreground">
              Need inspiration?
            </h4>
            <ul className="grid gap-1">
              <li>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => startTemplate('Coffee meetup')}
                >
                  ☕ Coffee meetup
                </Button>
              </li>
              <li>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => startTemplate('Group walk')}
                >
                  🚶‍♂️ Group walk
                </Button>
              </li>
            </ul>
          </div>
        )}

        {/* Toggle for quick ideas */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickIdeas(!quickIdeas)}
          className="text-xs text-muted-foreground"
        >
          {quickIdeas ? 'Hide ideas' : 'Need inspiration?'}
        </Button>
      </Card>
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
          <Card key={plan.id} className="p-4">
            <div className="font-medium">{plan.title}</div>
            <div className="text-sm text-muted-foreground">{plan.description}</div>
          </Card>
        ))}
      </div>

      {/* Floating action button for host when plans exist */}
      {floqDetails.is_creator && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
          onClick={() => navigate(`/floqs/${floqDetails.id}/plans/new`)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};
