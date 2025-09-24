import { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

export function LocationTracker() {
  const { user } = useAuth();
  const { coords, status, error } = useUnifiedLocation({
    enableTracking: true,
    enablePresence: false,
    hookId: 'location-tracker'
  });
  const pos = coords; // Compatibility alias
  const loading = status === 'loading';
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (user && pos && !error) {
      setIsTracking(true);
    } else {
      setIsTracking(false);
    }
  }, [user, pos, error]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Getting location...</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Location unavailable</span>
            </>
          ) : isTracking ? (
            <>
              <MapPin className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-foreground">Tracking for afterglow</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location tracking off</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          {loading && <Badge variant="outline">Getting location…</Badge>}
          {error && <Badge variant="destructive">GPS error</Badge>}
          {!loading && !error && <Badge variant="outline">Tracking ON</Badge>}
          
          {pos && (
            <div className="text-xs text-muted-foreground">
              ±{Math.round(pos.accuracy)}m
            </div>
          )}
        </div>
      </div>
    </div>
  );
}