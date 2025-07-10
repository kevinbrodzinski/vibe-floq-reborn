import { Button } from "@/components/ui/button";
import { MapPin, Compass } from "lucide-react";
import { AvatarDropdown } from "@/components/AvatarDropdown";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface FieldHeaderProps {
  locationReady?: boolean;
  currentLocation?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const FieldHeader = ({ 
  locationReady = false, 
  currentLocation = "Locating...",
  className,
  style
}: FieldHeaderProps) => {
  return (
    <header 
      className={cn(
        "flex items-center justify-between px-6 pt-safe-top h-16",
        "pointer-events-auto relative",
        "bg-background/60 backdrop-blur-xl",
        "border-b border-border/20",
        className
      )}
      style={style}
    >
      {/* Left: Location */}
      <Button 
        variant="ghost" 
        size="sm"
        className={cn(
          "flex items-center space-x-2 text-foreground/80 hover:text-foreground",
          "hover:bg-accent/50 transition-all duration-200",
          "min-h-[44px] px-3" // Touch-friendly
        )}
      >
        {locationReady ? (
          <MapPin className="w-4 h-4 text-primary" />
        ) : (
          <Compass className="w-4 h-4 text-muted-foreground animate-spin" />
        )}
        <span className="text-sm font-medium truncate max-w-[120px]">
          {currentLocation}
        </span>
      </Button>
      
      {/* Center: Logo */}
      <div 
        className="text-2xl font-light tracking-wide text-primary cursor-pointer"
        onClick={() => {
          track('posthog_test', { 
            source: 'field_header',
            timestamp: new Date().toISOString(),
            test: true
          });
          console.log('PostHog test event sent!');
        }}
      >
        floq
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center">
        <AvatarDropdown />
      </div>
    </header>
  );
};