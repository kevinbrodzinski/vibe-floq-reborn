
import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Plan = Database['public']['Tables']['floq_plans']['Row'];

interface PlanEditModalProps {
  plan: {
    id: string;
    title: string;
    description?: string | null;
    status: any;
    max_participants?: number | null;
    [key: string]: any;
  };
  open?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PlanFormData {
  title: string;
  description?: string;
  max_participants?: number;
  status: Database['public']['Enums']['plan_status_enum'];
}

export const PlanEditModal: React.FC<PlanEditModalProps> = ({
  plan,
  open,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PlanFormData>({
    defaultValues: {
      title: plan.title,
      description: plan.description || '',
      max_participants: plan.max_participants || undefined,
      status: plan.status as Database['public']['Enums']['plan_status_enum'],
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: PlanFormData) => {
      const { error } = await supabase
        .from('floq_plans')
        .update({
          title: updates.title,
          description: updates.description,
          max_participants: updates.max_participants || null,
          status: updates.status,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', plan.id as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
      onSuccess();
    },
    onError: (error) => {
      console.error('Update failed:', error);
      toast.error('Failed to update plan');
    },
  });

  const onSubmit = (data: PlanFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
              placeholder="Plan title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Plan description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <Input
              id="max_participants"
              type="number"
              min="1"
              {...register('max_participants', { 
                valueAsNumber: true,
                min: { value: 1, message: 'Must be at least 1' }
              })}
              placeholder="No limit"
            />
            {errors.max_participants && (
              <p className="text-sm text-destructive">{errors.max_participants.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={watch('status')} 
              onValueChange={(value) => setValue('status', value as Database['public']['Enums']['plan_status_enum'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
                <SelectItem value="executing">Executing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
