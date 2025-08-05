import { MapPin, Compass } from "lucide-react";
import { useMemo } from "react";

interface LocationDisplayProps {
  locationText: string;
  isReady: boolean;
  isLoading: boolean;
  lastHeartbeat?: number | null;
}

export const LocationDisplay = ({
  locationText,
  isReady,
  isLoading,
  lastHeartbeat
}: LocationDisplayProps) => {
  const isLive = useMemo(() => {
    if (!lastHeartbeat) return false;
    return Date.now() - lastHeartbeat < 60 * 60 * 1000; // 1 hour in milliseconds
  }, [lastHeartbeat]);

  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <Compass className="w-4 h-4 text-muted-foreground animate-spin" />
      ) : (
        <MapPin className="w-4 h-4 text-primary" />
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium truncate max-w-[160px] text-foreground/90">
          {locationText}
        </span>
        {isLive && (
          <span className="text-[10px] uppercase tracking-widest font-extralight text-green-500">
            live
          </span>
        )}
      </div>
    </div>
  );
};