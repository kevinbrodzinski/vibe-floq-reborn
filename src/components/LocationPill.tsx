import { MapPin, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationPillProps {
  city?: string;
  locationReady?: boolean;
  className?: string;
}

export const LocationPill = ({ 
  city = "Locating...", 
  locationReady = false,
  className 
}: LocationPillProps) => {
  return (
    <div 
      className={cn(
        "flex items-center space-x-2 px-3 py-2 rounded-full",
        "backdrop-blur-xl text-foreground/90 text-sm font-medium",
        "transition-all duration-200",
        className
      )}
    >
      {locationReady ? (
        <MapPin className="w-4 h-4 text-primary" />
      ) : (
        <Compass className="w-4 h-4 text-muted-foreground animate-spin" />
      )}
      <span className="truncate max-w-[120px]">
        {city}
      </span>
    </div>
  );
};