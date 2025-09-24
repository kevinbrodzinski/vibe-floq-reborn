import React, { useState } from 'react';
import { Fingerprint, Rewind, Users, Maximize2, Minimize2, Shield, MapPin, Bug, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { emitEvent, Events } from '@/services/eventBridge';
import { enableVibePreview, cycleVibePreview, isVibePreviewEnabled, getVibePreviewColor } from '@/lib/vibe/vibeColor';
import { getLS, setLS } from '@/lib/safeStorage';
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
import { LocationSystemHealthDashboard } from '@/components/debug/LocationSystemHealthDashboard';

export const LayerSelectionFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  
  const LS_KEY = 'floq:layers:predicted-meet:enabled';
  const [predMeetOn, setPredMeetOn] = useState<boolean>(() => {
    const raw = getLS(LS_KEY);
    return raw == null ? true : raw === 'true';
  });
  // NEW: flow-route persisted state
  const LS_KEY_FLOW = 'floq:layers:flow-route:enabled';
  const [flowOn, setFlowOn] = useState<boolean>(() => {
    const raw = getLS(LS_KEY_FLOW);
    return raw == null ? true : raw === 'true';
  });
  // NEW: breadcrumb-trail persisted state
  const LS_KEY_BREADCRUMB = 'floq:layers:breadcrumb-trail:enabled';
  const [breadcrumbOn, setBreadcrumbOn] = useState<boolean>(() => {
    const raw = getLS(LS_KEY_BREADCRUMB);
    return raw == null ? true : raw === 'true';
  });
  const [vibePrevOn, setVibePrevOn] = useState(() => isVibePreviewEnabled());
  
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

        {/* Flow route */}
        <DropdownMenuItem
          onSelect={() => {
            const next = !flowOn; setFlowOn(next);
            setLS(LS_KEY_FLOW, String(next));
            emitEvent(Events.FLOQ_LAYER_TOGGLE, { id: 'flow-route', enabled: next });
          }}
          className="flex items-center gap-3 h-10"
        >
          <span>🌀</span>
          <span>Flow route</span>
          <span className="ml-auto opacity-70 text-xs">{flowOn ? 'On' : 'Off'}</span>
        </DropdownMenuItem>

        {/* Breadcrumb trail */}
        <DropdownMenuItem
          onSelect={() => {
            const next = !breadcrumbOn; setBreadcrumbOn(next);
            setLS(LS_KEY_BREADCRUMB, String(next));
            emitEvent(Events.FLOQ_LAYER_TOGGLE, { id: 'breadcrumb-trail', enabled: next });
          }}
          className="flex items-center gap-3 h-10"
        >
          <span>🍞</span>
          <span>Breadcrumb trail</span>
          <span className="ml-auto opacity-70 text-xs">{breadcrumbOn ? 'On' : 'Off'}</span>
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
        {import.meta.env.DEV && (
          <DropdownMenuItem onSelect={() => setDebugOpen(!debugOpen)} className="flex items-center gap-3 h-10">
            <Bug className="h-4 w-4" />
            <span>{debugOpen ? 'Hide Debug Panel' : 'Show Debug Panel'}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <NearbyVenuesSheet isOpen={nearbyOpen} onClose={() => setNearbyOpen(false)} onVenueTap={() => {}} />
    {import.meta.env.DEV && debugOpen && (
      <LocationSystemHealthDashboard onClose={() => setDebugOpen(false)} />
    )}
    </>
  );
};