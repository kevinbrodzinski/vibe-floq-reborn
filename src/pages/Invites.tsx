import React, { useState } from 'react';
import { useUserInvitations } from '@/hooks/useUserInvitations';
import { PlanCardCompact } from '@/components/PlanCardCompact';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Invites() {
  const navigate = useNavigate();
  const [groupMode, setGroupMode] = useState<'floq' | 'plan_type'>('floq');
  const { invitations, grouped, isLoading, respondToInvitation } = useUserInvitations(groupMode);

  const handleRSVP = async (inviteId: string, planId: string, accept: boolean) => {
    await respondToInvitation(inviteId, planId, accept);
  };

  const getGroupTitle = (groupKey: string, invites: any[]) => {
    if (groupMode === 'floq') {
      return invites[0]?.plan?.floq?.title || invites[0]?.plan?.floq?.name || 'Independent Plans';
    }
    return groupKey.charAt(0).toUpperCase() + groupKey.slice(1) + ' Plans';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Invitations</h1>
            {invitations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {invitations.length}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Grouping Toggle */}
        {invitations.length > 0 && (
          <Card className="p-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={groupMode === 'floq' ? 'default' : 'outline'}
                onClick={() => setGroupMode('floq')}
                className="text-xs"
              >
                <Users className="w-3 h-3 mr-1" />
                By Floq
              </Button>
              <Button
                size="sm"
                variant={groupMode === 'plan_type' ? 'default' : 'outline'}
                onClick={() => setGroupMode('plan_type')}
                className="text-xs"
              >
                <Calendar className="w-3 h-3 mr-1" />
                By Type
              </Button>
            </div>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <EmptyState
            title="No Active Invitations"
            description="When friends invite you to plans, they'll appear here. You can accept or decline to help us learn your preferences."
            animation="party-balloons"
          />
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([groupKey, invites]) => (
              <div key={groupKey} className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {getGroupTitle(groupKey, invites)}
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {invites.length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <Card
                      key={invite.id}
                      className="p-4 hover-scale transition-all duration-200"
                    >
                      <PlanCardCompact plan={invite.plan} />
                      
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
                        <Button
                          onClick={() => handleRSVP(invite.id, invite.plan.id, true)}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          Join Plan
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRSVP(invite.id, invite.plan.id, false)}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          Not Today
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}