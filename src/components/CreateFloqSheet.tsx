import React, { useState, useEffect } from 'react';
import { X, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { useCreateFloq, type CreateFloqParams, type FlockType } from '@/hooks/useCreateFloq';
import { useUserSettings } from '@/hooks/useUserSettings';
import { WELCOME_MESSAGE_TEMPLATES } from '@/constants/welcomeMessageTemplates';
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
  const { settings, updateWelcomeTemplate } = useUserSettings();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('social');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [isPrivate, setIsPrivate] = useState(false);
  const [durationMode, setDurationMode] = useState<'quick' | 'custom' | 'persistent'>('quick');
  const [customEndTime, setCustomEndTime] = useState('');
  const [hasTouchedTitle, setHasTouchedTitle] = useState(false);
  const [selectedWelcomeTemplate, setSelectedWelcomeTemplate] = useState<string>('casual-hangout');

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
      // Use user's preferred template or default
      setSelectedWelcomeTemplate(settings?.preferred_welcome_template || 'casual-hangout');
    }
  }, [showCreateSheet, settings?.preferred_welcome_template]);

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
      let floqType: FlockType = 'momentary';

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

      const floqParams: CreateFloqParams = {
        title: title.trim(),
        description: description.trim() || undefined,
        primary_vibe: selectedVibe,
        location,
        starts_at: now.toISOString(),
        ends_at: endsAt,
        flock_type: floqType,
        visibility: isPrivate ? 'private' : 'public',
        invitees: [],
        max_participants: maxParticipants,
      };

      const floqId = await createFloq(floqParams);

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
      <SheetContent side="bottom" className="w-full max-w-lg mx-auto p-0 overflow-hidden sm:rounded-2xl h-[85vh] flex flex-col" style={{ marginBottom: 'var(--mobile-nav-height, 64px)' }}>
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3 text-lg font-semibold">
              <Sparkles className="w-6 h-6 text-primary" />
              Create New Floq
            </SheetTitle>
            <SheetDescription className="mt-2">
              Create a new floq to connect with friends and plan activities together.
            </SheetDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateSheet(false)}
              className="hover:bg-accent/50 transition-all duration-200 hover:scale-105"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Form Content - Scrollable with flex-col layout */}
        <form id="create-floq-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" style={{ overscrollBehavior: 'contain' }}>
              <div className="p-6 space-y-6">
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
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Description</Label>
                    <span className={`text-xs ${description.length > 140 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {description.length}/140
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this floq about? (optional)"
                    rows={3}
                    maxLength={140}
                  />
                </div>

                {/* Vibe Selection */}
                <div>
                  <Label className="mb-3 block">Vibe</Label>
                  <div className="flex flex-wrap gap-3">
                    {VIBE_OPTIONS.map((vibe) => (
                      <Badge
                        key={vibe}
                        variant={selectedVibe === vibe ? "default" : "outline"}
                        className="cursor-pointer px-4 py-2.5 capitalize hover:scale-105 transition-all duration-300 font-medium rounded-full border-2"
                        style={{
                          backgroundColor: selectedVibe === vibe ? (VIBE_COLORS[vibe] || 'hsl(var(--primary))') : 'transparent',
                          borderColor: VIBE_COLORS[vibe] || 'hsl(var(--primary))',
                          color: selectedVibe === vibe ? 'white' : (VIBE_COLORS[vibe] || 'hsl(var(--primary))'),
                          boxShadow: selectedVibe === vibe 
                            ? `0 0 0 3px ${VIBE_COLORS[vibe]}30, 0 4px 12px ${VIBE_COLORS[vibe]}40` 
                            : '0 2px 8px rgba(0,0,0,0.1)',
                          transform: selectedVibe === vibe ? 'scale(1.05)' : 'scale(1)',
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
                  <div className="flex gap-3 mb-4">
                    <Button
                      type="button"
                      variant={durationMode === 'quick' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDurationModeChange('quick')}
                      className="flex-1 py-3 font-medium transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: durationMode === 'quick' ? 'hsl(var(--primary))' : 'transparent',
                        boxShadow: durationMode === 'quick' 
                          ? '0 0 0 2px hsl(var(--primary)/20), 0 4px 12px hsl(var(--primary)/30)' 
                          : '0 2px 8px rgba(0,0,0,0.1)',
                        transform: durationMode === 'quick' ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      Quick (2 h)
                    </Button>
                    <Button
                      type="button"
                      variant={durationMode === 'custom' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDurationModeChange('custom')}
                      className="flex-1 py-3 font-medium transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: durationMode === 'custom' ? 'hsl(var(--primary))' : 'transparent',
                        boxShadow: durationMode === 'custom' 
                          ? '0 0 0 2px hsl(var(--primary)/20), 0 4px 12px hsl(var(--primary)/30)' 
                          : '0 2px 8px rgba(0,0,0,0.1)',
                        transform: durationMode === 'custom' ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      Custom
                    </Button>
                    <Button
                      type="button"
                      variant={durationMode === 'persistent' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDurationModeChange('persistent')}
                      className="flex-1 py-3 font-medium transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: durationMode === 'persistent' ? 'hsl(var(--primary))' : 'transparent',
                        boxShadow: durationMode === 'persistent' 
                          ? '0 0 0 2px hsl(var(--primary)/20), 0 4px 12px hsl(var(--primary)/30)' 
                          : '0 2px 8px rgba(0,0,0,0.1)',
                        transform: durationMode === 'persistent' ? 'scale(1.02)' : 'scale(1)',
                      }}
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

                {/* Welcome Message Template */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Welcome Message</Label>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => updateWelcomeTemplate(selectedWelcomeTemplate as any)}
                       disabled={selectedWelcomeTemplate === settings?.preferred_welcome_template}
                       className="text-xs h-7 px-3 font-medium transition-all duration-200 hover:scale-105"
                     >
                       Save as default
                     </Button>
                  </div>
                  <div className="space-y-3">
                    {WELCOME_MESSAGE_TEMPLATES.map((template) => (
                      <div key={template.id} className="flex items-start gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-all duration-200">
                        <input
                          type="radio"
                          id={`template-${template.id}`}
                          name="welcomeTemplate"
                          value={template.id}
                          checked={selectedWelcomeTemplate === template.id}
                          onChange={(e) => setSelectedWelcomeTemplate(e.target.value)}
                          className="mt-1 text-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`template-${template.id}`}
                            className="block text-sm font-medium cursor-pointer mb-2"
                          >
                            {template.name}
                          </label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {template.content}
                          </p>
                        </div>
                      </div>
                    ))}
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
          </div>

          {/* Submit Button - Fixed to bottom of modal */}
          <div className="flex-shrink-0 bg-background border-t p-4">
            <Button 
              type="submit"
              className="w-full py-4 font-medium text-base transition-all duration-300 hover:scale-105" 
              disabled={!title.trim() || isPending || (durationMode === 'custom' && !customEndTime)}
              aria-disabled={isPending}
              style={{
                boxShadow: !title.trim() || isPending || (durationMode === 'custom' && !customEndTime)
                  ? '0 2px 8px rgba(0,0,0,0.1)'
                  : '0 0 0 2px hsl(var(--primary)/20), 0 8px 24px hsl(var(--primary)/30)',
              }}
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {isPending ? 'Creating...' : 'Create Floq'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}