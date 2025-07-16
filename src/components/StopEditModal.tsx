import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Database } from '@/integrations/supabase/types';

type PlanStop = Database['public']['Tables']['plan_stops']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row'];
};

interface StopEditModalProps {
  stop: PlanStop;
  onClose: () => void;
  onSave: (updates: Partial<PlanStop>) => void;
}

export const StopEditModal = ({ stop, onClose, onSave }: StopEditModalProps) => {
  const [title, setTitle] = useState(stop.title || '');
  const [description, setDescription] = useState(stop.description || '');
  const [startTime, setStartTime] = useState(stop.start_time || '');
  const [endTime, setEndTime] = useState(stop.end_time || '');
  const [address, setAddress] = useState(stop.address || '');

  const handleSave = () => {
    // Validate time range
    if (startTime && endTime && startTime >= endTime) {
      return; // Could show toast error here
    }

    onSave({
      title: title.trim() || 'Untitled Stop',
      description: description.trim() || null,
      start_time: startTime || null,
      end_time: endTime || null,
      address: address.trim() || null
    });
  };

  // Handle escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useState(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const isValid = title.trim().length > 0 && (!startTime || !endTime || startTime < endTime);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Stop</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Stop title"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening here?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Where is this happening?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};