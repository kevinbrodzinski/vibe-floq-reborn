
import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const NewPlan = () => {
  const { floqId } = useParams<{ floqId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const template = searchParams.get('template');

  const [formData, setFormData] = useState({
    title: template || '',
    description: '',
    plannedAt: '',
    endAt: '',
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // TODO: Implement actual plan creation with useCreatePlan hook
      console.log('Creating plan:', { ...formData, floqId });
      
      // For now, just navigate back
      setTimeout(() => {
        navigate(`/floqs/${floqId}?tab=plans`);
      }, 1000);
    } catch (error) {
      console.error('Failed to create plan:', error);
    } finally {
      setIsCreating(false);
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
            onClick={() => navigate(`/floqs/${floqId}?tab=plans`)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Create Plan</h1>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter plan title..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="What's the plan?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plannedAt">Date & Time</Label>
              <Input
                id="plannedAt"
                type="datetime-local"
                value={formData.plannedAt}
                onChange={(e) => handleInputChange('plannedAt', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endAt">End Time (Optional)</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => handleInputChange('endAt', e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/floqs/${floqId}?tab=plans`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreating || !formData.title || !formData.plannedAt}
              >
                {isCreating ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default NewPlan;
