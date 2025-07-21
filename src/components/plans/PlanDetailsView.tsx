
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PlanStatus } from '@/types/enums/planStatus';

interface PlanDetailsViewProps {
  planId?: string;
}

export const PlanDetailsView: React.FC<PlanDetailsViewProps> = ({ planId: propPlanId }) => {
  const { planId: paramPlanId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const planId = propPlanId || paramPlanId;

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['plan-details', planId],
    queryFn: async () => {
      if (!planId) throw new Error('Plan ID is required');
      
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          *,
          floqs (
            title,
            description
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });

  const { data: participants } = useQuery({
    queryKey: ['plan-participants', planId],
    queryFn: async () => {
      if (!planId) return [];
      
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', planId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
  });

  const getStatusColor = (status: PlanStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'invited':
        return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading plan...</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Plan not found</h2>
          <p className="text-muted-foreground mb-4">
            This plan may have been deleted or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/plans')}>
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plans')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </Button>
        </div>

        {/* Plan Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{plan.title}</CardTitle>
                {plan.floqs?.title && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Part of {plan.floqs.title}
                  </p>
                )}
                {plan.description && (
                  <p className="text-muted-foreground">{plan.description}</p>
                )}
              </div>
              <Badge variant="outline" className={getStatusColor(plan.status)}>
                {plan.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(plan.planned_at), 'PPP')}
                </span>
              </div>
              
              {plan.start_time && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {plan.start_time} - {plan.end_time || 'Open ended'}
                  </span>
                </div>
              )}

              {participants && participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {plan.max_participants && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Max {plan.max_participants} participants
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        {participants && participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.user_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      {participant.profiles?.avatar_url ? (
                        <img
                          src={participant.profiles.avatar_url}
                          alt={participant.profiles.display_name || participant.profiles.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {(participant.profiles?.display_name || participant.profiles?.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {participant.profiles?.display_name || participant.profiles?.username || 'Unknown User'}
                      </p>
                      {participant.profiles?.username && participant.profiles?.display_name && (
                        <p className="text-xs text-muted-foreground">
                          @{participant.profiles.username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
