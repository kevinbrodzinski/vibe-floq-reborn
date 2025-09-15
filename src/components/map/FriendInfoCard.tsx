import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useFriendSelection } from '@/hooks/useFriendSelection';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';
import { Button } from '@/components/ui/button';

export function FriendInfoCard() {
  const { selected, clear } = useFriendSelection();
  
  if (!selected) return null;

  const vibe = safeVibe(selected.vibe || 'chill');
  const vibeHex = selected.color || vibeToHex(vibe);
  const label = selected.id === 'self' ? 'You' : (selected.name ?? 'Friend');
  const isSelf = selected.id === 'self';

  const formatDistance = (distanceM?: number) => {
    if (!distanceM) return 'nearby';
    if (distanceM < 1000) return `${Math.round(distanceM)} m away`;
    return `${(distanceM / 1000).toFixed(1)} km away`;
  };

  const formatLastSeen = (lastSeen?: number) => {
    if (!lastSeen) return '';
    const now = Date.now();
    const diffMs = now - lastSeen;
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${Math.floor(diffHour / 24)}d ago`;
  };

  const handleRecenter = () => {
    window.dispatchEvent(new CustomEvent('floq:geolocate'));
    clear();
  };

  const handleNavigate = () => {
    window.dispatchEvent(new CustomEvent('floq:navigate', { 
      detail: { to: selected.lngLat } 
    }));
    clear();
  };

  const handlePing = () => {
    window.dispatchEvent(new CustomEvent('floq:ping', { 
      detail: { id: selected.id } 
    }));
    clear();
  };

  return (
    <Sheet open={!!selected} onOpenChange={(open) => !open && clear()}>
      <SheetContent side="bottom" className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          {selected.avatarUrl && (
            <img 
              src={selected.avatarUrl} 
              alt={`${label} avatar`}
              className="w-10 h-10 rounded-full object-cover" 
            />
          )}
          <div className="flex-1">
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">
              {formatDistance(selected.distanceM)} · {vibe}
              {selected.lastSeen && !isSelf && ` · ${formatLastSeen(selected.lastSeen)}`}
            </div>
          </div>
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: vibeHex }} 
          />
        </div>

        <div className="flex gap-2">
          {isSelf ? (
            <Button size="sm" onClick={handleRecenter}>
              Recenter
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={handlePing}>
                Ping
              </Button>
              <Button size="sm" onClick={handleNavigate}>
                Navigate
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={clear}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}