
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, MapPin, Edit2, Trash2, MoreHorizontal, Users, Clock, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlanEditModal } from './PlanEditModal';
import { PlanStatus } from '@/types/enums/planStatus';
import { usePlanMeta } from '@/hooks/usePlanMeta';
import { formatCurrency, formatDuration } from '@/lib/format';
import { planStatusColor } from '@/lib/planStatusColor';

interface PlanCardProps {
  plan: {
    id: string;
    title: string;
    description?: string | null;
    status: PlanStatus;
    planned_at: string;
    created_at: string;
    creator_id: string;
    floqs?: {
      title: string;
    } | null;
    // Optional database fields
    archived_at?: string | null;
    budget_per_person?: number | null;
    collaboration_status?: string | null;
    current_stop_id?: string | null;
    duration_hours?: number | null;
    end_at?: string | null;
    end_time?: string | null;
    execution_started_at?: string | null;
    floq_id?: string | null;
    location?: any;
    max_participants?: number | null;
    start_time?: string | null;
    total_budget?: number | null;
    updated_at?: string | null;
    vibe_tag?: string | null;
    vibe_tags?: string[] | null;
  };
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: meta } = usePlanMeta(plan.id);

  const deletePlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('floq_plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-floq-plans'] });
      toast({
        title: 'Plan deleted',
        description: 'Your plan has been deleted successfully.'
      });
    },
    onError: (error) => {
      console.error('Failed to delete plan:', error);
      toast({
        title: 'Failed to delete plan',
        description: 'There was an error deleting your plan. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePlan.mutateAsync();
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
      return;
    }
    navigate(`/plans/${plan.id}`);
  };

  const getStatusColor = (status: string) => {
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

  return (
    <>
      <Card 
        className="hover:shadow-md transition-all cursor-pointer group relative"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {plan.title}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Badge className={planStatusColor[plan.status as keyof typeof planStatusColor]}>
                {plan.status}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditModal(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {plan.floqs?.title && (
            <p className="text-sm text-muted-foreground">
              Part of {plan.floqs.title}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0">
          {plan.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {plan.description}
            </p>
          )}
          
          <div className="space-y-3">
            {/* Metadata chips */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(plan.planned_at), 'MMM d, yyyy')}</span>
              </div>
              {meta?.participant_count && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{meta.participant_count} joining</span>
                </div>
              )}
              {meta?.total_duration_minutes && meta.total_duration_minutes > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(meta.total_duration_minutes)}</span>
                </div>
              )}
              {meta?.estimated_cost_per_person && meta.estimated_cost_per_person > 0 && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>{formatCurrency(meta.estimated_cost_per_person)}/person</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {meta?.total_stops && meta.total_stops > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{meta.confirmed_stops || 0}/{meta.total_stops} stops</span>
                </div>
                <div aria-label={`Plan progress: ${Math.round(((meta.confirmed_stops || 0) / meta.total_stops) * 100)}% complete`}>
                  <Progress 
                    value={((meta.confirmed_stops || 0) / meta.total_stops) * 100}
                    className="h-1.5"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && (
        <PlanEditModal
          plan={plan}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Plan"
        description="Are you sure you want to delete this plan? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
};
