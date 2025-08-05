import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  createCollection,
  updateCollection,
  Collection
} from '@/lib/supabase-helpers';
import { useToast } from '@/hooks/use-toast';

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
  mode: 'create' | 'edit';
}

export function CollectionDialog({
  open,
  onOpenChange,
  collection,
  mode
}: CollectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  // Reset form when dialog opens/closes or collection changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && collection) {
        setFormData({
          name: collection.name,
          description: collection.description || '',
          color: collection.color || '#3b82f6'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '#3b82f6'
        });
      }
    }
  }, [open, mode, collection]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'create') {
        return createCollection(formData.name, formData.description, formData.color);
      } else if (collection) {
        return updateCollection(collection.id, formData);
      }
      throw new Error('Invalid operation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      onOpenChange(false);
      toast({
        title: mode === 'create' ? 'Collection created' : 'Collection updated',
        description: 'Your collection has been saved successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: mode === 'create' ? 'Failed to create collection' : 'Failed to update collection',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a collection name',
        variant: 'destructive'
      });
      return;
    }

    mutation.mutate();
  };

  const colorOptions = [
    { color: '#3b82f6', name: 'Blue' },
    { color: '#ef4444', name: 'Red' },
    { color: '#22c55e', name: 'Green' },
    { color: '#f59e0b', name: 'Orange' },
    { color: '#8b5cf6', name: 'Purple' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#84cc16', name: 'Lime' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Collection' : 'Edit Collection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Collection name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this collection about?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {colorOptions.map(({ color, name }) => (
                <button
                  key={color}
                  type="button"
                  className={`p-2 rounded-lg border-2 transition-all ${
                    formData.color === color 
                      ? 'border-foreground ring-2 ring-foreground/20' 
                      : 'border-border hover:border-foreground/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  title={name}
                >
                  <div 
                    className="w-full h-6 rounded"
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {mode === 'create' ? 'Create' : 'Save'} Collection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}