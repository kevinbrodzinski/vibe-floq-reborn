import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Filter, X, RotateCcw, MapPin, Users, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useFloqUI } from '@/contexts/FloqUIContext';
import type { DateRange } from 'react-day-picker';
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

interface EnhancedFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedFilterModal({ open, onOpenChange }: EnhancedFilterModalProps) {
  const { advancedFilters, setAdvancedFilters } = useFloqUI();
  const [localFilters, setLocalFilters] = useState(advancedFilters);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  // Sync local state when sheet opens
  useEffect(() => {
    if (open) setLocalFilters(advancedFilters);
  }, [open, advancedFilters]);

  const timeRange = localFilters.timeRange || [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)];

  const handleDistanceChange = (distance: number[]) => {
    setLocalFilters(prev => ({ ...prev, radiusKm: distance[0] }));
  };

  const handleVibeToggle = (vibe: Vibe) => {
    setLocalFilters(prev => {
      const currentVibes = prev.vibes || [];
      const isSelected = currentVibes.includes(vibe);
      
      return {
        ...prev,
        vibes: isSelected 
          ? currentVibes.filter(v => v !== vibe)
          : [...currentVibes, vibe]
      };
    });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setLocalFilters(prev => ({
        ...prev,
        timeRange: [range.from!, range.to!]
      }));
      setDateRangeOpen(false);
    }
  };

  const handleActiveToggle = (checked: boolean) => {
    setLocalFilters(prev => ({ ...prev, showOnlyActive: checked }));
  };

  const handleSearchChange = (query: string) => {
    setLocalFilters(prev => ({ ...prev, query }));
  };

  const handleApplyFilters = () => {
    setAdvancedFilters(localFilters);
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      query: '',
      radiusKm: 25,
      vibes: [],
      timeRange: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] as [Date, Date],
      showOnlyActive: false
    };
    setLocalFilters(defaultFilters);
    setAdvancedFilters(defaultFilters);
    onOpenChange(false);
  };

  const hasLocalFilters = Boolean(
    localFilters.query?.trim() ||
    localFilters.radiusKm !== 25 ||
    localFilters.vibes?.length > 0 ||
    localFilters.showOnlyActive
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Advanced Search
            </SheetTitle>
            {hasLocalFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-20">
          {/* Search Query */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Search Term</Label>
            <Input
              placeholder="Search floqs by title..."
              value={localFilters.query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-background/50"
            />
          </div>

          {/* Distance Slider */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Distance
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[localFilters.radiusKm ?? 25]}
                onValueChange={handleDistanceChange}
                max={100}
                min={1}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground min-w-12">
                {localFilters.radiusKm ?? 25}km
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1km</span>
              <span>100km</span>
            </div>
          </div>

          {/* Vibe Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Vibes
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {VIBE_OPTIONS.map((vibe) => {
                const isSelected = localFilters.vibes?.includes(vibe) || false;
                const color = VIBE_COLORS[vibe] || 'hsl(var(--primary))';
                
                return (
                  <Badge
                    key={vibe}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer p-3 justify-center capitalize hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: isSelected ? color : 'transparent',
                      borderColor: color,
                      color: isSelected ? 'white' : color,
                    }}
                    onClick={() => handleVibeToggle(vibe)}
                  >
                    {vibe}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Time Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Range
            </Label>
            <Button
              variant="outline"
              onClick={() => setDateRangeOpen(true)}
              className="w-full justify-start"
            >
              {format(timeRange[0], 'MMM dd')} – {format(timeRange[1], 'MMM dd, yyyy')}
            </Button>
          </div>

          {/* Active Only Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Active Floqs Only</Label>
              <p className="text-xs text-muted-foreground">
                Show only floqs with recent activity
              </p>
            </div>
            <Switch
              checked={localFilters.showOnlyActive || false}
              onCheckedChange={handleActiveToggle}
            />
          </div>
        </div>

        {/* Date Range Popover */}
        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen} modal>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={{
                from: timeRange[0],
                to: timeRange[1]
              }}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}