import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadiusSlider } from '@/components/RadiusSlider';
import { useFloqUI } from '@/contexts/FloqUIContext';
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

export function FilterModal() {
  const {
    showFiltersModal,
    setShowFiltersModal,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  } = useFloqUI();

  const handleVibeToggle = (vibe: Vibe) => {
    setFilters(prev => ({
      ...prev,
      vibe: prev.vibe === vibe ? undefined : vibe
    }));
  };

  const handleDistanceChange = (distance: number) => {
    setFilters(prev => ({
      ...prev,
      distanceKm: distance
    }));
  };

  const handleActiveToggle = (isActive: boolean) => {
    setFilters(prev => ({
      ...prev,
      isActive: isActive || undefined
    }));
  };

  const handleClearFilters = () => {
    clearFilters();
    setShowFiltersModal(false);
  };

  return (
    <Sheet open={showFiltersModal} onOpenChange={setShowFiltersModal}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Filter Flocks</SheetTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFiltersModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Distance Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Walking Distance
            </Label>
            <RadiusSlider
              km={filters.distanceKm || 1}
              onChange={handleDistanceChange}
            />
          </div>

          {/* Vibe Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Vibe
            </Label>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((vibe) => (
                <Badge
                  key={vibe}
                  variant={filters.vibe === vibe ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1 capitalize hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: filters.vibe === vibe ? (VIBE_COLORS[vibe] || 'hsl(var(--primary))') : 'transparent',
                    borderColor: VIBE_COLORS[vibe] || 'hsl(var(--primary))',
                    color: filters.vibe === vibe ? 'white' : (VIBE_COLORS[vibe] || 'hsl(var(--primary))'),
                  }}
                  onClick={() => handleVibeToggle(vibe)}
                >
                  {vibe}
                </Badge>
              ))}
            </div>
          </div>

          {/* Active Only Filter */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Active Flocks Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Show only flocks with recent activity
              </p>
            </div>
            <Switch
              checked={filters.isActive || false}
              onCheckedChange={handleActiveToggle}
            />
          </div>

          {/* Apply Button */}
          <div className="pt-4">
            <Button 
              className="w-full" 
              onClick={() => setShowFiltersModal(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}