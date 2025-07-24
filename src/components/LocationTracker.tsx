import { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuth } from '@/providers/AuthProvider';

export function LocationTracker() {
  const { user } = useAuth();
  const { location, loading, error } = useUserLocation();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (user && location && !error) {
      setIsTracking(true);
    } else {
      setIsTracking(false);
    }
  }, [user, location, error]);

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
        
        {location && (
          <div className="text-xs text-muted-foreground mt-1">
            Accuracy: ±{Math.round(location.coords.accuracy)}m
          </div>
        )}
      </div>
    </div>
  );
}