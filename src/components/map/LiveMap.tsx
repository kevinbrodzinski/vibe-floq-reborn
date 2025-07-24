import { useFriendLocations } from '@/hooks/useFriendLocations';
import { useUserLocation } from '@/hooks/useUserLocation';

interface LiveMapProps {
  friendIds: string[];
  className?: string;
}

interface FriendMarker {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  isStale: boolean;
}

export function LiveMap({ friendIds, className }: LiveMapProps) {
  const { pos } = useUserLocation();
  const friends = useFriendLocations(friendIds);

  const friendMarkers: FriendMarker[] = Object.entries(friends).map(([id, location]) => ({
    id,
    lat: location.lat,
    lng: location.lng,
    accuracy: location.acc,
    timestamp: location.ts,
    isStale: Date.now() - location.ts > 60000 // Stale after 60 seconds
  }));

  return (
    <div className={`relative bg-background border rounded-lg ${className}`}>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Live Friend Locations</h3>
        
        {/* Current user location */}
        {pos && (
          <div className="mb-2 p-2 bg-primary/10 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm font-medium">You</span>
              <span className="text-xs text-muted-foreground">
                {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
              </span>
              {pos.accuracy && (
                <span className="text-xs text-muted-foreground">
                  ±{Math.round(pos.accuracy)}m
                </span>
              )}
            </div>
          </div>
        )}

        {/* Friend locations */}
        <div className="space-y-2">
          {friendMarkers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends sharing location</p>
          ) : (
            friendMarkers.map((friend) => (
              <div 
                key={friend.id} 
                className={`p-2 rounded-md ${friend.isStale ? 'bg-muted/50' : 'bg-secondary/50'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${friend.isStale ? 'bg-muted-foreground' : 'bg-secondary'}`}></div>
                  <span className={`text-sm font-medium ${friend.isStale ? 'text-muted-foreground' : ''}`}>
                    Friend {friend.id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {friend.lat.toFixed(4)}, {friend.lng.toFixed(4)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ±{Math.round(friend.accuracy)}m
                  </span>
                  {friend.isStale && (
                    <span className="text-xs text-muted-foreground">(stale)</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last seen: {new Date(friend.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}