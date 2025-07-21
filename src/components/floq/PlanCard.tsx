import React from 'react';
import { Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePlanRSVP } from '@/hooks/usePlanRSVP';
import { formatDistance } from 'date-fns';

interface Plan {
  id: string;
  title: string;
  description?: string;
  planned_at: string;
  location?: string;
  is_joined?: boolean;
  participant_count?: number;
  max_participants?: number;
  floq_id: string;
}

interface PlanCardProps {
  plan: Plan;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const rsvp = usePlanRSVP();
  const isJoined = plan.is_joined ?? false;

  const handleRsvp = () => {
    rsvp.mutate({ 
      planId: plan.id, 
      status: isJoined ? 'not_attending' : 'attending'
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Title and Description */}
        <div>
          <h4 className="font-medium">{plan.title}</h4>
          {plan.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {plan.description}
            </p>
          )}
        </div>

        {/* Plan Details */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDistance(new Date(plan.planned_at), new Date(), { addSuffix: true })}
            </span>
          </div>

          {plan.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>{plan.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="w-3 h-3" />
            <span>
              {plan.participant_count || 0}
              {plan.max_participants && ` / ${plan.max_participants}`} going
            </span>
          </div>
        </div>

        {/* RSVP Button */}
        <div className="flex justify-end">
          <Button
            size="sm"
            variant={isJoined ? 'secondary' : 'default'}
            disabled={rsvp.isPending}
            onClick={handleRsvp}
            className="min-w-[80px]"
          >
            {rsvp.isPending ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isJoined ? (
              'Leave'
            ) : (
              'Join'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};