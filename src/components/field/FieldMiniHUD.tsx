import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Crosshair, Filter, Users, Waves, CloudSun, Clock } from 'lucide-react';

interface FieldMiniHUDProps {
  onCenterMap: () => void;
  onOpenFilters?: () => void;
  onOpenNearbyFriends?: () => void;
  onOpenTimewarp?: () => void;
  onToggleWeather?: () => void;
  densityMode: boolean;
  onToggleDensity: () => void;
}

export const FieldMiniHUD: React.FC<FieldMiniHUDProps> = ({
  onCenterMap,
  onOpenFilters,
  onOpenNearbyFriends,
  onOpenTimewarp,
  onToggleWeather,
  densityMode,
  onToggleDensity,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 z-[85] pointer-events-none">
      <div className="pointer-events-auto">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="secondary" aria-label="Map actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onSelect={onCenterMap}>
              <Crosshair className="h-4 w-4 mr-2" /> Center on me
            </DropdownMenuItem>
            {onOpenFilters && (
              <DropdownMenuItem onSelect={onOpenFilters}>
                <Filter className="h-4 w-4 mr-2" /> Filters
              </DropdownMenuItem>
            )}
            {onOpenNearbyFriends && (
              <DropdownMenuItem onSelect={onOpenNearbyFriends}>
                <Users className="h-4 w-4 mr-2" /> Nearby friends
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onToggleDensity}>
              <Waves className="h-4 w-4 mr-2" /> {densityMode ? 'Density: On' : 'Density: Off'}
            </DropdownMenuItem>
            {onOpenTimewarp && (
              <DropdownMenuItem onSelect={onOpenTimewarp}>
                <Clock className="h-4 w-4 mr-2" /> Timewarp
              </DropdownMenuItem>
            )}
            {onToggleWeather && (
              <DropdownMenuItem onSelect={onToggleWeather}>
                <CloudSun className="h-4 w-4 mr-2" /> Weather
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};