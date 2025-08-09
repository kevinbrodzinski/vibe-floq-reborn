import React, { useState } from 'react';
import { Filter, MoreVertical, Waves, Clock } from 'lucide-react';
import { FullscreenFab } from '@/components/map/FullscreenFab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVisibleFriendsOnMap } from '@/hooks/useVisibleFriendsOnMap';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useFriendDrawer } from '@/contexts/FriendDrawerContext';
import { useTimewarpDrawer } from '@/contexts/TimewarpDrawerContext';

interface FieldHUDProps {
  onOpenFilters: () => void;
  onOpenTimewarp?: () => void;
  onOpenNearbyFriends?: () => void;
  onCenterMap: () => void;
  onToggleWeather: () => void;
  activeVibe?: string;
  onSelectVibe?: (vibe: string) => void;
  densityMode?: boolean;
  onToggleDensity?: () => void;
}

const VIBE_OPTIONS = ['social','hype','chill','curious','solo','romantic','weird','down','flowing','open'];

export const FieldHUD: React.FC<FieldHUDProps> = ({
  onOpenFilters,
  onOpenTimewarp,
  onOpenNearbyFriends,
  onCenterMap,
  onToggleWeather,
  activeVibe,
  onSelectVibe,
  densityMode = false,
  onToggleDensity,
}) => {
  const { people } = useVisibleFriendsOnMap();
  const { hasPermission, status, coords } = useUnifiedLocation({ hookId: 'field-hud' });
  const liveCount = people.length;

  const { toggle: toggleFriends } = useFriendDrawer();
  const { toggle: toggleTimewarp } = useTimewarpDrawer();

  const [openDial, setOpenDial] = useState(false);

  // Mock mode helpers (loaded lazily to avoid bundle issues)
  let mockHelpers: any = null;
  try { mockHelpers = require('@/lib/mock/MockMode'); } catch {}
  const mockOn = !!mockHelpers?.isMockModeEnabled?.();
  const [, setMockTick] = useState(0);
  const toggleMock = () => {
    if (!mockHelpers) return;
    if (mockHelpers.isMockModeEnabled()) mockHelpers.disableMockMode();
    else mockHelpers.enableMockModeForSeconds(15 * 60);
    setMockTick(t => t + 1);
  };

  return (
    <div className="pointer-events-none">
      {/* Bottom action bar (responsive) */}
      <div
        className="pointer-events-auto fixed left-1/2 -translate-x-1/2 z-[95] flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg
                   px-3 py-2 sm:px-4 sm:py-2"
        style={{ bottom: 'calc(var(--mobile-nav-height, 72px) + env(safe-area-inset-bottom) + 12px)' }}
      >
        {/* Filters (icon on xs, label on sm+) */}
        <Button size="sm" variant="ghost" onClick={onOpenFilters} className="gap-2">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          <Badge variant="outline" className="ml-1 text-[10px] sm:text-xs">{liveCount}</Badge>
        </Button>

        <div className="mx-1 sm:mx-2 h-6 w-px bg-white/10" />

        {/* Vibe chips - horizontal scroll, compact on mobile */}
        <div className="flex max-w-[44vw] sm:max-w-[60vw] overflow-x-auto whitespace-nowrap no-scrollbar gap-1 sm:gap-1.5">
          {VIBE_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => onSelectVibe?.(v)}
              className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs capitalize transition-colors ${activeVibe===v ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="mx-1 sm:mx-2 h-6 w-px bg-white/10" />

        {/* Density toggle (icon on xs) */}
        <Button size="sm" variant={densityMode ? 'default' : 'ghost'} onClick={onToggleDensity} aria-pressed={densityMode} className="gap-2">
          <Waves className="h-4 w-4" />
          <span className="hidden sm:inline">{densityMode ? 'Density On' : 'Density'}</span>
        </Button>

        {/* Timewarp (icon on xs) */}
        <Button size="sm" variant="ghost" onClick={onOpenTimewarp ?? toggleTimewarp} className="gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Timewarp</span>
        </Button>
      </div>

      {/* Right-rail consolidated speed-dial */}
      <div className="pointer-events-auto fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-[90] flex flex-col items-center gap-2">
        <div className="relative">
          <Button size="icon" variant="secondary" onClick={() => setOpenDial(o => !o)} aria-haspopup title="Actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
          {openDial && (
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-lg">
              <Button size="sm" variant="ghost" onClick={onCenterMap} title="Center on me">Center</Button>
              <Button size="sm" variant="ghost" onClick={onOpenNearbyFriends ?? toggleFriends} title="Nearby friends">Nearby</Button>
              <Button size="sm" variant="ghost" onClick={onToggleWeather} title="Weather">Weather</Button>
              <Button size="sm" variant="ghost" onClick={onOpenTimewarp ?? toggleTimewarp} title="Timewarp">Timewarp</Button>
              {/* Demo / Mock data toggle */}
              <Button size="sm" variant="ghost" onClick={toggleMock} title="Toggle demo data">
                {mockOn ? 'Demo: On' : 'Demo: Off'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Top-left system chips */}
      <div className="pointer-events-none fixed left-3 sm:left-4 top-3 sm:top-4 z-[80] flex items-center gap-1.5 sm:gap-2">
        <span className={`pointer-events-auto text-[10px] sm:text-xs px-2 py-1 rounded-full ${status==='success' && hasPermission ? 'bg-emerald-600/30 text-emerald-200' : 'bg-yellow-600/30 text-yellow-100'}`}>
          {hasPermission ? (status==='success' ? 'Live' : 'Locating…') : 'Permission'}
        </span>
        {typeof coords?.accuracy === 'number' && (
          <span className="pointer-events-auto text-[10px] sm:text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
            ±{Math.round(coords.accuracy)}m
          </span>
        )}
      </div>

      {/* Fullscreen FAB re-used */}
      <div className="pointer-events-auto fixed bottom-[calc(var(--mobile-nav-height,72px)+env(safe-area-inset-bottom)+12px)] right-3 sm:right-4 z-[85]">
        <FullscreenFab />
      </div>
    </div>
  );
};