
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreatePlan } from '@/hooks/useCreatePlan';
import { toast } from '@/hooks/use-toast';

const NewPlan = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createPlan, isPending } = useCreatePlan();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    planned_at: '',
    end_at: '',
    max_participants: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!floqId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Floq ID is missing",
      });
      return;
    }

    if (!formData.title || !formData.planned_at) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in the required fields",
      });
      return;
    }

    try {
      await createPlan({
        title: formData.title,
        description: formData.description || undefined,
        planned_at: formData.planned_at,
        end_at: formData.end_at || undefined,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : undefined,
        floq_id: floqId,
      });

      toast({
        title: "Success",
        description: "Plan created successfully!",
      });

      navigate(`/floqs/${floqId}`);
    } catch (error) {
      console.error('Failed to create plan:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create plan. Please try again.",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/floqs/${floqId}`)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Plan</h1>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title *</Label>
              <Input
                id="title"
                placeholder="What's the plan?"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us more about this plan..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planned_at" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date & Time *
                </Label>
                <Input
                  id="planned_at"
                  type="datetime-local"
                  value={formData.planned_at}
                  onChange={(e) => handleInputChange('planned_at', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_at" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Date & Time
                </Label>
                <Input
                  id="end_at"
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => handleInputChange('end_at', e.target.value)}
                />
              </div>
            </div>

            {/* Max Participants */}
            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants</Label>
              <Input
                id="max_participants"
                type="number"
                min="2"
                placeholder="Leave empty for unlimited"
                value={formData.max_participants}
                onChange={(e) => handleInputChange('max_participants', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/floqs/${floqId}`)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending}
              >
                {isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default NewPlan;
