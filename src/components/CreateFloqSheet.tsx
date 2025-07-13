import React, { useState, useEffect } from 'react';
import { X, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { useCreateFloq } from '@/hooks/useCreateFloq';
import { trackFloqCreated } from '@/lib/analytics';
import type { Vibe } from '@/types';

const VIBE_OPTIONS: Vibe[] = [
  'chill', 'hype', 'romantic', 'social', 'solo', 'weird', 'flowing', 'down'
];

const VIBE_COLORS: Partial<Record<Vibe, string>> = {
  chill: 'hsl(180, 70%, 60%)',
  hype: 'hsl(260, 70%, 65%)',
  romantic: 'hsl(330, 70%, 65%)',
  social: 'hsl(25, 70%, 60%)',
  solo: 'hsl(210, 70%, 65%)',
  weird: 'hsl(280, 70%, 65%)',
  flowing: 'hsl(100, 70%, 60%)',
  down: 'hsl(220, 15%, 55%)',
};

export function CreateFloqSheet() {
  const { showCreateSheet, setShowCreateSheet } = useFloqUI();
  const { mutateAsync: createFloq, isPending } = useCreateFloq();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('social');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [isPrivate, setIsPrivate] = useState(false);
  const [durationMode, setDurationMode] = useState<'quick' | 'custom' | 'persistent'>('quick');
  const [customEndTime, setCustomEndTime] = useState('');
  const [hasTouchedTitle, setHasTouchedTitle] = useState(false);

  // Reset form states when sheet opens
  useEffect(() => {
    if (showCreateSheet) {
      setTitle('');
      setDescription('');
      setSelectedVibe('social');
      setMaxParticipants(20);
      setIsPrivate(false);
      setDurationMode('quick');
      setCustomEndTime('');
      setHasTouchedTitle(false);
    }
  }, [showCreateSheet]);

  const handleDurationModeChange = (mode: 'quick' | 'custom' | 'persistent') => {
    setDurationMode(mode);
    // Reset custom end time for clean state transitions
    setCustomEndTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    // Validate custom end time
    if (durationMode === 'custom') {
      if (!customEndTime) {
        console.error('Custom end time is required');
        return;
      }
      const endTime = new Date(customEndTime);
      const now = new Date();
      if (endTime <= now) {
        console.error('End time must be in the future');
        return;
      }
    }

    try {
      // Get user's current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const now = new Date();
      let endsAt: string | null = null;
      let floqType: 'momentary' | 'persistent' = 'momentary';

      // Calculate end time based on duration mode
      if (durationMode === 'persistent') {
        endsAt = null;
        floqType = 'persistent';
      } else if (durationMode === 'custom' && customEndTime) {
        // Fix timezone issue: convert local datetime to proper ISO string
        const localDate = new Date(customEndTime);
        endsAt = localDate.toISOString();
        floqType = 'momentary';
      } else {
        // Quick mode - default 2 hours
        endsAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        floqType = 'momentary';
      }

      const floqId = await createFloq({
        title: title.trim(),
        description: description.trim() || undefined,
        primary_vibe: selectedVibe,
        location,
        starts_at: now.toISOString(),
        ends_at: endsAt,
        // Backend expects flock_type not floq_type
        flock_type: floqType,
        max_participants: maxParticipants,
        visibility: isPrivate ? 'private' : 'public'
      });

      // Track floq creation
      trackFloqCreated(floqId, title.trim(), selectedVibe, isPrivate, floqType, endsAt);

      // Close sheet - success navigation handled by useCreateFloq
      setShowCreateSheet(false);
    } catch (error) {
      console.error('Failed to create floq:', error);
    }
  };

  return (
    <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
      <SheetContent side="bottom" className="w-full max-w-lg p-0 overflow-hidden sm:rounded-2xl sm:max-h-[90vh] h-[90vh]">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create New Floq
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateSheet(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-6 py-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Floq Name *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={(e) => {
                    setHasTouchedTitle(true);
                    // Ensure mobile keyboards trigger validation properly
                    if (e.target) setHasTouchedTitle(true);
                  }}
                  placeholder="Coffee & Coding Session"
                  maxLength={50}
                  required
                  aria-invalid={!title.trim() && hasTouchedTitle}
                  className={cn(!title.trim() && hasTouchedTitle ? "border-destructive" : "")}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this floq about? (optional)"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Vibe Selection */}
              <div>
                <Label className="mb-3 block">Vibe</Label>
                <div className="flex flex-wrap gap-2">
                  {VIBE_OPTIONS.map((vibe) => (
                    <Badge
                      key={vibe}
                      variant={selectedVibe === vibe ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1 capitalize hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: selectedVibe === vibe ? (VIBE_COLORS[vibe] || 'hsl(var(--primary))') : 'transparent',
                        borderColor: VIBE_COLORS[vibe] || 'hsl(var(--primary))',
                        color: selectedVibe === vibe ? 'white' : (VIBE_COLORS[vibe] || 'hsl(var(--primary))'),
                      }}
                      onClick={() => setSelectedVibe(vibe)}
                    >
                      {vibe}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Duration Mode */}
              <div>
                <Label className="mb-3 block">Duration</Label>
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={durationMode === 'quick' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDurationModeChange('quick')}
                    className="flex-1"
                  >
                    Quick (2 h)
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === 'custom' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDurationModeChange('custom')}
                    className="flex-1"
                  >
                    Custom
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === 'persistent' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDurationModeChange('persistent')}
                    className="flex-1"
                  >
                    Ongoing
                  </Button>
                </div>

                {/* Custom End Time Picker */}
                {durationMode === 'custom' && (
                  <div>
                    <Label htmlFor="custom-end-time">End Time</Label>
                    <Input
                      id="custom-end-time"
                      type="datetime-local"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      min={(() => {
                        const minDate = new Date(Date.now() + 60 * 60 * 1000);
                        minDate.setMinutes(0, 0, 0);
                        return minDate.toISOString().slice(0, 16);
                      })()} // At least 1 hour from now, on clean minute
                      className="mt-1"
                    />
                  </div>
                )}

                 {/* Persistent Info */}
                {durationMode === 'persistent' && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      You can end this floq any time from the detail screen.
                    </p>
                  </div>
                )}

                {/* Disabled Custom Picker Notice with proper visual state */}
                {durationMode === 'persistent' && (
                  <div className="pointer-events-none opacity-50">
                    <Label htmlFor="custom-end-time-disabled" className="text-muted-foreground">End Time</Label>
                    <Input
                      id="custom-end-time-disabled"
                      type="datetime-local"
                      value=""
                      disabled
                      className="mt-1"
                      placeholder="Not applicable for ongoing floqs"
                    />
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Private Floq</Label>
                    <p className="text-sm text-muted-foreground">
                      Only invited users can join
                    </p>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>
              </div>

              {/* Location Info */}
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Location will be set to your current position</span>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Submit Button */}
          <div className="p-4 border-t bg-background">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!title.trim() || isPending}
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isPending ? 'Creating...' : 'Create Floq'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}