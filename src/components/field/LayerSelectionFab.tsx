import React, { useState } from 'react';
import { Fingerprint, Rewind, Users, Maximize2, Minimize2, Shield, MapPin, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTimewarpDrawer } from '@/contexts/TimewarpDrawerContext';
import { useFriendDrawer } from '@/contexts/FriendDrawerContext';
import { useFullscreenMap } from '@/store/useFullscreenMap';
import { useSafeMode } from '@/hooks/useSafeMode';
import { NearbyVenuesSheet } from '@/components/NearbyVenuesSheet';

type LayerSelectionFabProps = {
  onOpenDebug?: () => void;
};

export const LayerSelectionFab = ({ onOpenDebug }: LayerSelectionFabProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  
  // Hook into existing functionality
  const { open: timewarpOpen, toggle: toggleTimewarp } = useTimewarpDrawer();
  const { open: friendOpen, toggle: toggleFriend } = useFriendDrawer();
  const { mode: fullscreenMode, toggleFull } = useFullscreenMap();
  const { isActive: ghostEnabled, toggleSafeMode } = useSafeMode();
  
  const isFull = fullscreenMode === 'full';



  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Layer selection menu"
          aria-controls="layer-selection-menu"
          aria-expanded={isOpen}
          className="
            fixed top-20 right-4 z-[65] h-11 w-11
            rounded-full bg-background/90 backdrop-blur
            flex items-center justify-center shadow-lg
            border border-border hover:bg-muted/50 transition-colors
            hover:scale-105 active:scale-95
          "
        >
          <Fingerprint className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => setNearbyOpen(true)} className="flex items-center gap-3 h-10">
          <MapPin className="h-4 w-4" />
          <span>Nearby venues</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleFriend()} className="flex items-center gap-3 h-10">
          <Users className="h-4 w-4" />
          <span>Friend layer</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleTimewarp()} className="flex items-center gap-3 h-10">
          <Rewind className="h-4 w-4" />
          <span>Timewarp layer</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleSafeMode(!ghostEnabled)} className="flex items-center gap-3 h-10">
          <Shield className="h-4 w-4" />
          <span>{ghostEnabled ? 'Disable Ghost mode' : 'Enable Ghost mode'}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onSelect={() => toggleFull()} className="flex items-center gap-3 h-10">
          {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span>{isFull ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
        </DropdownMenuItem>

        {/* Debug (dev/flag only) */}
        {(import.meta.env.DEV || import.meta.env.VITE_DEBUG_UI === 'true') && (
          <DropdownMenuItem onSelect={() => onOpenDebug?.()} className="flex items-center gap-3 h-10">
            <Zap className="h-4 w-4" />
            <span>Debug tools</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <NearbyVenuesSheet isOpen={nearbyOpen} onClose={() => setNearbyOpen(false)} onVenueTap={() => {}} />
    </>
  );
};