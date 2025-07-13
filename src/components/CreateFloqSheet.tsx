import React, { useState } from 'react';
import { X, MapPin, Sparkles } from 'lucide-react';
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
  const [duration, setDuration] = useState(4); // hours

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

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
      const endsAt = new Date(now.getTime() + duration * 60 * 60 * 1000);

      const floqId = await createFloq({
        title: title.trim(),
        description: description.trim() || undefined,
        primary_vibe: selectedVibe,
        location,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        max_participants: maxParticipants,
        visibility: isPrivate ? 'private' : 'public'
      });

      // Track floq creation
      trackFloqCreated(floqId, title.trim(), selectedVibe, isPrivate);

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedVibe('social');
      setMaxParticipants(20);
      setIsPrivate(false);
      setDuration(4);
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

        {/* Scrollable Form */}
        <ScrollArea className="h-[70vh] sm:h-auto overscroll-contain">
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4 pb-12">
            {/* Title */}
            <div>
              <Label htmlFor="title">Floq Name *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Coffee & Coding Session"
                maxLength={50}
                required
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

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    min={2}
                    max={100}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={1}
                    max={24}
                    className="mt-1"
                  />
                </div>
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
          </form>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-background/90 backdrop-blur p-4 border-t">
          <Button 
            type="submit" 
            onClick={handleSubmit}
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
      </SheetContent>
    </Sheet>
  );
}