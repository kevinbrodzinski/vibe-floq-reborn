import React from 'react';
import { PlanCardCompact } from '@/components/plans/PlanCardCompact';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InviteRowProps {
  invite: {
    id: string;
    plan: {
      id: string;
      title: string;
      description?: string;
      planned_at: string;
      vibe_tags?: string[];
      floq?: {
        id: string;
        name: string;
        title: string;
        primary_vibe: string;
      };
    };
  };
  isLoading: boolean;
  onAccept: (inviteId: string, planId: string) => void;
  onDecline: (inviteId: string, planId: string) => void;
}

export const InviteRow: React.FC<InviteRowProps> = ({ 
  invite, 
  isLoading, 
  onAccept, 
  onDecline 
}) => {
  return (
    <div
      className="border border-border/50 rounded-xl p-4 bg-card hover-scale animate-fade-in"
      role="article"
      aria-label={`Invitation to ${invite.plan.title}`}
    >
      <PlanCardCompact plan={invite.plan} />
      
      <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
        <Button
          size="sm"
          onClick={() => onAccept(invite.id, invite.plan.id)}
          disabled={isLoading}
          className="flex-1"
          aria-label={`Accept invitation to ${invite.plan.title}`}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDecline(invite.id, invite.plan.id)}
          disabled={isLoading}
          className="flex-1"
          aria-label={`Decline invitation to ${invite.plan.title}`}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Decline
        </Button>
      </div>
    </div>
  );
};