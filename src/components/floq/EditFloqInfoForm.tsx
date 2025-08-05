import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import type { Vibe } from '@/types';

const VIBE_OPTIONS: Vibe[] = [
  'chill', 'hype', 'curious', 'social', 'solo', 
  'romantic', 'weird', 'down', 'flowing', 'open'
];

const VIBE_COLORS: Partial<Record<Vibe, string>> = {
  chill: '#10B981',
  hype: '#F59E0B', 
  curious: '#8B5CF6',
  social: '#EF4444',
  solo: '#6B7280',
  romantic: '#EC4899',
  weird: '#84CC16',
  down: '#3B82F6',
  flowing: '#06B6D4',
  open: '#F97316'
};

interface EditFloqInfoFormProps {
  floqDetails: FloqDetails;
}

export const EditFloqInfoForm: React.FC<EditFloqInfoFormProps> = ({ floqDetails }) => {
  const [formData, setFormData] = useState({
    title: floqDetails.title,
    description: floqDetails.description || '',
    primary_vibe: floqDetails.primary_vibe,
    flock_type: floqDetails.ends_at ? 'momentary' : 'persistent',
    max_participants: floqDetails.max_participants || 20,
    visibility: floqDetails.visibility,
    starts_at: floqDetails.starts_at ? new Date(floqDetails.starts_at).toISOString().slice(0, 16) : '',
    ends_at: floqDetails.ends_at ? new Date(floqDetails.ends_at).toISOString().slice(0, 16) : ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Calculate hasChanges using useMemo with direct comparison
  const hasChanges = useMemo(() => {
    const originalData = {
      title: floqDetails.title,
      description: floqDetails.description || '',
      primary_vibe: floqDetails.primary_vibe,
      flock_type: floqDetails.ends_at ? 'momentary' : 'persistent',
      max_participants: floqDetails.max_participants || 20,
      visibility: floqDetails.visibility,
      starts_at: floqDetails.starts_at ? new Date(floqDetails.starts_at).toISOString().slice(0, 16) : '',
      ends_at: floqDetails.ends_at ? new Date(floqDetails.ends_at).toISOString().slice(0, 16) : ''
    };
    
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [
    formData,
    floqDetails.title,
    floqDetails.description,
    floqDetails.primary_vibe,
    floqDetails.ends_at,
    floqDetails.max_participants,
    floqDetails.visibility,
    floqDetails.starts_at
  ]);

  // Pure validation function without side effects (for disabled state)
  const isFormValid = () => {
    // Title validation
    if (!formData.title.trim()) return false;
    if (formData.title.trim().length < 3) return false;

    // Time validation for momentary floqs
    if (formData.flock_type === 'momentary') {
      if (formData.starts_at && formData.ends_at) {
        const startTime = new Date(formData.starts_at);
        const endTime = new Date(formData.ends_at);
        if (endTime <= startTime) return false;
      }
    }

    // Max participants validation
    if (formData.max_participants < 2) return false;

    return true;
  };

  // Validation function with side effects (for form submission)
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    // Time validation for momentary floqs
    if (formData.flock_type === 'momentary') {
      if (formData.starts_at && formData.ends_at) {
        const startTime = new Date(formData.starts_at);
        const endTime = new Date(formData.ends_at);
        if (endTime <= startTime) {
          newErrors.ends_at = 'End time must be after start time';
        }
      }
    }

    // Max participants validation
    if (formData.max_participants < 2) {
      newErrors.max_participants = 'Must allow at least 2 participants';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const scrollToFirstError = () => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.focus();
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      scrollToFirstError();
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        primary_vibe: formData.primary_vibe,
        max_participants: formData.max_participants,
        visibility: formData.visibility,
        flock_type: formData.flock_type
      };

      // Handle timing based on flock_type
      if (formData.flock_type === 'persistent') {
        updateData.ends_at = null;
      } else if (formData.flock_type === 'momentary') {
        if (formData.ends_at) {
          updateData.ends_at = new Date(formData.ends_at).toISOString();
        }
      }

      if (formData.starts_at) {
        updateData.starts_at = new Date(formData.starts_at).toISOString();
      }

      const { error } = await supabase
        .from('floqs')
        .update(updateData)
        .eq('id', floqDetails.id);

      if (error) throw error;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['floq-details', floqDetails.id] });
      
      toast.success('Floq updated successfully');
    } catch (error) {
      console.error('Failed to update floq:', error);
      toast.error('Failed to update floq');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium">Basic Information</h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                  // Clear error when user starts typing
                  if (errors.title) {
                    setErrors(prev => ({ ...prev, title: '' }));
                  }
                }}
                placeholder="Enter floq title"
                maxLength={50}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What's this floq about?"
                rows={3}
                maxLength={200}
              />
            </div>

            <div>
              <Label className="mb-3 block">Vibe</Label>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((vibe) => (
                  <Badge
                    key={vibe}
                    variant={formData.primary_vibe === vibe ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    style={{
                      backgroundColor: formData.primary_vibe === vibe ? (VIBE_COLORS[vibe] || 'hsl(var(--primary))') : 'transparent',
                      borderColor: VIBE_COLORS[vibe] || 'hsl(var(--primary))',
                      color: formData.primary_vibe === vibe ? 'white' : (VIBE_COLORS[vibe] || 'hsl(var(--primary))'),
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, primary_vibe: vibe }))}
                  >
                    {vibe}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium">Floq Settings</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Floq Type</Label>
                <p className="text-sm text-muted-foreground">
                  Persistent floqs run indefinitely, momentary floqs have an end time
                </p>
              </div>
              <Select 
                value={formData.flock_type} 
                onValueChange={(value: 'persistent' | 'momentary') => 
                  setFormData(prev => ({ ...prev, flock_type: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persistent">Persistent</SelectItem>
                  <SelectItem value="momentary">Momentary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Public floqs can be discovered by anyone
                </p>
              </div>
              <Select 
                value={formData.visibility} 
                onValueChange={(value: string) => 
                  setFormData(prev => ({ ...prev, visibility: value }))
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max_participants">Max Participants</Label>
              <Input
                id="max_participants"
                type="number"
                min="2"
                max="100"
                value={formData.max_participants}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    max_participants: parseInt(e.target.value) || 20 
                  }));
                  if (errors.max_participants) {
                    setErrors(prev => ({ ...prev, max_participants: '' }));
                  }
                }}
                className={`w-24 ${errors.max_participants ? 'border-destructive' : ''}`}
              />
              {errors.max_participants && (
                <p className="text-sm text-destructive mt-1">{errors.max_participants}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Timing
          </h4>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="starts_at">Start Time</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
              />
            </div>

            {formData.flock_type === 'momentary' && (
              <div>
                <Label htmlFor="ends_at">End Time</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, ends_at: e.target.value }));
                    if (errors.ends_at) {
                      setErrors(prev => ({ ...prev, ends_at: '' }));
                    }
                  }}
                  className={errors.ends_at ? 'border-destructive' : ''}
                />
                {errors.ends_at && (
                  <p className="text-sm text-destructive mt-1">{errors.ends_at}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!isFormValid() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};