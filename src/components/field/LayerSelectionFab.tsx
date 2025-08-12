import React, { useState } from 'react';
import { Fingerprint, Rewind, Users, Maximize2, Minimize2 } from 'lucide-react';
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

export const LayerSelectionFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Hook into existing functionality
  const { open: timewarpOpen, toggle: toggleTimewarp } = useTimewarpDrawer();
  const { open: friendOpen, toggle: toggleFriend } = useFriendDrawer();
  const { mode: fullscreenMode, toggleFull } = useFullscreenMap();
  
  const isFull = fullscreenMode === 'full';

  const handleTimewarpToggle = () => {
    toggleTimewarp();
    setIsOpen(false);
  };

  const handleFriendToggle = () => {
    toggleFriend();
    setIsOpen(false);
  };

  const handleFullscreenToggle = () => {
    toggleFull();
    setIsOpen(false);
  };

  return (
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
      
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-background/95 backdrop-blur border-border"
        sideOffset={8}
      >
        <DropdownMenuItem 
          onClick={handleTimewarpToggle}
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 focus:bg-muted/50"
        >
          <Rewind className="h-4 w-4" />
          <span>Timewarp Layer</span>
          {timewarpOpen && (
            <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleFriendToggle}
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 focus:bg-muted/50"
        >
          <Users className="h-4 w-4" />
          <span>Friend Layer</span>
          {friendOpen && (
            <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-border" />
        
        <DropdownMenuItem 
          onClick={handleFullscreenToggle}
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 focus:bg-muted/50"
        >
          {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span>{isFull ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};