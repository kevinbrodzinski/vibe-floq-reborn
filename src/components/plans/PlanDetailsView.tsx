
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PlanEditModal } from './PlanEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface PlanDetailsViewProps {
  planId: string;
}

export const PlanDetailsView: React.FC<PlanDetailsViewProps> = ({ planId }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          *,
          floqs(title, creator_id, location)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('floq_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Plan deleted',
        description: 'Your plan has been deleted successfully.'
      });

      navigate('/plans');
    } catch (error) {
      console.error('Failed to delete plan:', error);
      toast({
        title: 'Failed to delete plan',
        description: 'There was an error deleting your plan. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/plans')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Plan not found or you don't have access to it.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/plans')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{plan.title}</CardTitle>
                {plan.floqs?.title && (
                  <p className="text-muted-foreground">
                    Part of {plan.floqs.title}
                  </p>
                )}
              </div>
              <Badge variant="outline" className={getStatusColor(plan.status)}>
                {plan.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {plan.description && (
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Planned Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(plan.planned_at), 'PPP')}
                  </p>
                </div>
              </div>
              
              {plan.start_time && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Start Time</p>
                    <p className="text-sm text-muted-foreground">{plan.start_time}</p>
                  </div>
                </div>
              )}
              
              {plan.max_participants && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Max Participants</p>
                    <p className="text-sm text-muted-foreground">{plan.max_participants}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground pt-4 border-t">
              Created {format(new Date(plan.created_at), 'PPp')}
              {plan.updated_at !== plan.created_at && (
                <> • Last updated {format(new Date(plan.updated_at), 'PPp')}</>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <PlanEditModal
          plan={plan}
          onClose={() => setIsEditing(false)}
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
    </div>
  );
};
