import { LocationPill } from "@/components/LocationPill";
import { Logo } from "@/components/Logo";
import { AvatarButton } from "@/components/AvatarButton";
import { HeartbeatIndicator } from "@/components/HeartbeatIndicator";
import { cn } from "@/lib/utils";

interface FieldHeaderProps {
  locationReady?: boolean;
  currentLocation?: string;
  className?: string;
  style?: React.CSSProperties;
  onNavigate?: () => void;
  showMiniMap?: boolean;
  onToggleMiniMap?: () => void;
  lastHeartbeat?: number;
}

export const FieldHeader = ({ 
  locationReady = false, 
  currentLocation = "Locating...",
  className,
  style,
  onNavigate,
  showMiniMap,
  onToggleMiniMap,
  lastHeartbeat
}: FieldHeaderProps) => {
  return (
    <header 
      className={cn(
        "flex items-center justify-between px-4 pt-safe-top h-12",
        "pointer-events-auto relative",
        className
      )}
      style={style}
    >
      <LocationPill 
        city={currentLocation}
        locationReady={locationReady}
        className="ring-1 ring-white/10 bg-black/40"
      />
      
      <Logo className="text-2xl font-semibold tracking-wide" />
      
      <div className="flex items-center gap-2">
        <HeartbeatIndicator lastHeartbeat={lastHeartbeat} />
        <AvatarButton className="ring-1 ring-white/10 bg-black/40" />
      </div>
    </header>
  );
};