import React, { useState } from 'react';
import { Fingerprint, Rewind, Users, Maximize2, Minimize2, Shield, MapPin, Bug, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { emitEvent, Events } from '@/services/eventBridge';
import { enableVibePreview, cycleVibePreview, isVibePreviewEnabled, getVibePreviewColor } from '@/lib/vibe/vibeColor';
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
    try { const raw = localStorage.getItem(LS_KEY); return raw == null ? true : raw === 'true'; }
    catch { return true; }
  });
  // NEW: flow-route persisted state
  const LS_KEY_FLOW = 'floq:layers:flow-route:enabled';
  const [flowOn, setFlowOn] = useState<boolean>(() => {
    try { const raw = localStorage.getItem(LS_KEY_FLOW); return raw == null ? true : raw === 'true'; } catch { return true; }
  });
  // NEW: breadcrumb-trail persisted state
  const LS_KEY_BREADCRUMB = 'floq:layers:breadcrumb-trail:enabled';
  const [breadcrumbOn, setBreadcrumbOn] = useState<boolean>(() => {
    try { const raw = localStorage.getItem(LS_KEY_BREADCRUMB); return raw == null ? true : raw === 'true'; } catch { return true; }
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
        
        {/* Vibe preview (design QA) */}
        <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
          <button
            onClick={() => {
              const next = !vibePrevOn;
              setVibePrevOn(next);
              enableVibePreview(next);
            }}
            className="flex items-center gap-3"
            title="Preview pulse colors (cycles palette)"
          >
            <span
              className="w-4 h-4 rounded-full border border-white/20"
              style={{ background: vibePrevOn ? getVibePreviewColor() : 'transparent' }}
            />
            <span className="text-sm">Vibe preview</span>
          </button>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={vibePrevOn}
                onChange={e => { setVibePrevOn(e.target.checked); enableVibePreview(e.target.checked); }}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white/70 after:transition-all peer-checked:bg-white/20 peer-checked:after:translate-x-[16px]" />
            </label>
            <button
              onClick={() => { cycleVibePreview(); setVibePrevOn(p => p); }}
              disabled={!vibePrevOn}
              className="px-2 py-1 text-xs rounded-md border border-white/15 hover:bg-white/10 disabled:opacity-40"
              title="Cycle preview color"
            >
              Cycle
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="text-lg">🌀</span>
            <span className="text-sm">Flow route</span>
          </div>
          <button
            type="button"
            aria-pressed={flowOn}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              flowOn ? "bg-pink-500/70" : "bg-white/20"
            )}
            onClick={() => {
              const next = !flowOn;
              setFlowOn(next);
              try { localStorage.setItem(LS_KEY_FLOW, String(next)); } catch {}
              emitEvent(Events.FLOQ_LAYER_TOGGLE, { id: 'flow-route', enabled: next });
            }}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                flowOn ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        
        <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="text-lg">🍞</span>
            <span className="text-sm">Breadcrumb trail</span>
          </div>
          <button
            type="button"
            aria-pressed={breadcrumbOn}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              breadcrumbOn ? "bg-pink-500/70" : "bg-white/20"
            )}
            onClick={() => {
              const next = !breadcrumbOn;
              setBreadcrumbOn(next);
              try { localStorage.setItem(LS_KEY_BREADCRUMB, String(next)); } catch {}
              emitEvent(Events.FLOQ_LAYER_TOGGLE, { id: 'breadcrumb-trail', enabled: next });
            }}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                breadcrumbOn ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        
        <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Predicted meeting points</span>
          </div>
          <button
            type="button"
            aria-pressed={predMeetOn}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              predMeetOn ? "bg-pink-500/70" : "bg-white/20"
            )}
            onClick={() => {
              const next = !predMeetOn;
              setPredMeetOn(next);
              try { localStorage.setItem(LS_KEY, String(next)); } catch {}
              emitEvent(Events.FLOQ_LAYER_TOGGLE, { id: 'predicted-meet', enabled: next });
            }}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                predMeetOn ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
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