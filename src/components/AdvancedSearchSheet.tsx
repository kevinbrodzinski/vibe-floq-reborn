import React, { useState } from 'react';
import { X, RotateCcw, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { cn } from '@/lib/utils';
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

interface AdvancedSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvancedSearchSheet({ open, onOpenChange }: AdvancedSearchSheetProps) {
  const { advancedFilters, setAdvancedFilters } = useFloqUI();
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  const handleQueryChange = (query: string) => {
    setAdvancedFilters(prev => ({ ...prev, query }));
  };

  const handleRadiusChange = (radius: number[]) => {
    setAdvancedFilters(prev => ({ ...prev, radiusKm: radius[0] }));
  };

  const handleVibeToggle = (vibe: Vibe) => {
    setAdvancedFilters(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe]
    }));
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setAdvancedFilters(prev => ({
        ...prev,
        timeRange: [range.from!, range.to!]
      }));
      setDateRangeOpen(false);
    }
  };

  const handleActiveToggle = (showOnlyActive: boolean) => {
    setAdvancedFilters(prev => ({ ...prev, showOnlyActive }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      query: '',
      radiusKm: 25,
      vibes: [],
      timeRange: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
      showOnlyActive: false,
    });
  };

  const hasActiveAdvancedFilters = Boolean(
    advancedFilters.query ||
    advancedFilters.radiusKm !== 25 ||
    advancedFilters.vibes.length > 0 ||
    advancedFilters.showOnlyActive
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Advanced Search</SheetTitle>
            <div className="flex items-center gap-2">
              {hasActiveAdvancedFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAdvancedFilters}
                  className="text-destructive hover:text-destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <SheetDescription>
            Use advanced filters to find exactly what you're looking for.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Search Query */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Search Term
            </Label>
            <Input
              placeholder="Search floqs by title..."
              value={advancedFilters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Distance Slider */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              <MapPin className="w-4 h-4 inline mr-1" />
              Search Radius: {advancedFilters.radiusKm} km
            </Label>
            <Slider
              value={[advancedFilters.radiusKm]}
              onValueChange={handleRadiusChange}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* Time Range */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              <Clock className="w-4 h-4 inline mr-1" />
              Time Range
            </Label>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(advancedFilters.timeRange[0], 'MMM dd')} - {format(advancedFilters.timeRange[1], 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{
                    from: advancedFilters.timeRange[0],
                    to: advancedFilters.timeRange[1]
                  }}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Vibe Multi-Select */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Vibes ({advancedFilters.vibes.length} selected)
            </Label>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((vibe) => {
                const isSelected = advancedFilters.vibes.includes(vibe);
                return (
                  <Badge
                    key={vibe}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1 capitalize hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: isSelected ? (VIBE_COLORS[vibe] || 'hsl(var(--primary))') : 'transparent',
                      borderColor: VIBE_COLORS[vibe] || 'hsl(var(--primary))',
                      color: isSelected ? 'white' : (VIBE_COLORS[vibe] || 'hsl(var(--primary))'),
                    }}
                    onClick={() => handleVibeToggle(vibe)}
                  >
                    {vibe}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Active Only Filter */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Active Floqs Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Show only floqs with recent activity
              </p>
            </div>
            <Switch
              checked={advancedFilters.showOnlyActive || false}
              onCheckedChange={handleActiveToggle}
            />
          </div>

          {/* Apply Button */}
          <div className="pt-4">
            <Button 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Search Floqs
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}