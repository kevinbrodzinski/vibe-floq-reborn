import React from 'react';
import { Filter } from 'lucide-react';
import { FullscreenFab } from '@/components/map/FullscreenFab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVisibleFriendsOnMap } from '@/hooks/useVisibleFriendsOnMap';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';

interface FieldHUDProps {
  onOpenFilters: () => void;
  onOpenTimewarp: () => void;
  onOpenNearbyFriends: () => void;
  onCenterMap: () => void;
  onToggleWeather: () => void;
  activeVibe?: string;
  onSelectVibe?: (vibe: string) => void;
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
}) => {
  const { people } = useVisibleFriendsOnMap();
  const { hasPermission, status } = useUnifiedLocation({ hookId: 'field-hud' });
  const liveCount = people.length;

  return (
    <>
      {/* Bottom action bar */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2 shadow-lg">
        <Button size="sm" variant="ghost" onClick={onOpenFilters} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          <Badge variant="outline" className="ml-1 text-xs">{liveCount}</Badge>
        </Button>
        <div className="mx-2 h-6 w-px bg-white/10" />
        <div className="flex gap-1 overflow-x-auto max-w-[60vw]">
          {VIBE_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => onSelectVibe?.(v)}
              className={`px-2 py-1 rounded-full text-xs capitalize transition-colors ${activeVibe===v ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="mx-2 h-6 w-px bg-white/10" />
        <Button size="sm" variant="ghost" onClick={onOpenTimewarp}>Timewarp</Button>
      </div>

      {/* Right-rail quick actions */}
      <div className="pointer-events-auto fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
        <Button size="icon" variant="secondary" onClick={onCenterMap} title="Center on me">📍</Button>
        <Button size="icon" variant="secondary" onClick={onOpenNearbyFriends} title="Nearby friends">🫂</Button>
        <Button size="icon" variant="secondary" onClick={onToggleWeather} title="Weather">☼</Button>
      </div>

      {/* Top-left system chips */}
      <div className="pointer-events-none fixed left-4 top-4 z-40 flex items-center gap-2">
        <span className={`pointer-events-auto text-xs px-2 py-1 rounded-full ${status==='success' && hasPermission ? 'bg-emerald-600/30 text-emerald-200' : 'bg-yellow-600/30 text-yellow-100'}`}>
          {hasPermission ? (status==='success' ? 'Live' : 'Locating…') : 'Permission'}
        </span>
      </div>

      {/* Fullscreen FAB re-used */}
      <div className="fixed bottom-4 right-4 z-40">
        <FullscreenFab />
      </div>
    </>
  );
};