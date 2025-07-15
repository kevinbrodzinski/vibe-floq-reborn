import React, { useState } from 'react';
import { X, RotateCcw, Calendar, MapPin, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface EnhancedFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedFilterModal({ open, onOpenChange }: EnhancedFilterModalProps) {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useFloqUI();
  const [localFilters, setLocalFilters] = useState(filters);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  // Local state for date range (extending filters interface)
  const [timeRange, setTimeRange] = useState<[Date, Date]>([
    new Date(),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ]);
  
  const handleDistanceChange = (distance: number[]) => {
    setLocalFilters(prev => ({ ...prev, distanceKm: distance[0] }));
  };

  const handleVibeToggle = (vibe: Vibe) => {
    setLocalFilters(prev => ({
      ...prev,
      vibe: prev.vibe === vibe ? undefined : vibe
    }));
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setTimeRange([range.from, range.to]);
      setDateRangeOpen(false);
    }
  };

  const handleActiveToggle = (isActive: boolean) => {
    setLocalFilters(prev => ({ ...prev, isActive: isActive || undefined }));
  };

  const handleSearchChange = (searchQuery: string) => {
    setLocalFilters(prev => ({ ...prev, searchQuery: searchQuery || undefined }));
  };

  const handleApplyFilters = () => {
    setFilters(localFilters);
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    setTimeRange([new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
    clearFilters();
  };

  const hasLocalFilters = Boolean(
    localFilters.vibe ||
    localFilters.distanceKm !== undefined ||
    localFilters.isActive !== undefined ||
    localFilters.searchQuery?.trim()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>Filter Floqs</DialogTitle>
            <div className="flex items-center gap-2">
              {hasLocalFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-destructive hover:text-destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Query */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Search Term
            </Label>
            <Input
              placeholder="Search floqs by title..."
              value={localFilters.searchQuery || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Distance Slider */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              <MapPin className="w-4 h-4 inline mr-1" />
              Max Distance: {localFilters.distanceKm || 25} km
            </Label>
            <Slider
              value={[localFilters.distanceKm || 25]}
              onValueChange={handleDistanceChange}
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
            <Label className="text-sm font-medium mb-2 block">
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
                  {format(timeRange[0], 'MMM dd')} - {format(timeRange[1], 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
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
          </div>

          {/* Vibe Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Primary Vibe
            </Label>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((vibe) => {
                const isSelected = localFilters.vibe === vibe;
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
              <Label className="text-sm font-medium">
                <Zap className="w-4 h-4 inline mr-1" />
                Active Floqs Only
              </Label>
              <p className="text-xs text-muted-foreground">
                Show only floqs with recent activity
              </p>
            </div>
            <Switch
              checked={localFilters.isActive || false}
              onCheckedChange={handleActiveToggle}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6">
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
      </DialogContent>
    </Dialog>
  );
}