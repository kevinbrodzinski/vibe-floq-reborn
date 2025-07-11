import React from "react";
import { MapPin, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarDropdown } from "@/components/AvatarDropdown";

interface FieldHeaderProps {
  locality?: string;
  connectionLost?: boolean;
  className?: string;
}

/**
 * Compact, frosted header bar used on the Field screen
 * Matches the reference mock (12 pt height, blurred glass, centered logo)
 */
export const FieldHeader: React.FC<FieldHeaderProps> = ({ 
  locality = "Current location", 
  connectionLost = false,
  className
}) => {
  return (
    <header
      className={cn(
        "pt-safe-top sticky top-0 z-20 flex h-12 w-full items-center justify-between px-3",
        "bg-black/40 backdrop-blur ring-1 ring-white/10",
        className
      )}
    >
      {/* Left — location pill */}
      <div
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1 text-sm text-indigo-200",
          "bg-white/5 ring-1 ring-white/10"
        )}
      >
        <MapPin className="h-4 w-4" />
        <span>{locality}</span>
      </div>

      {/* Center — App wordmark */}
      <h1 className="pointer-events-none select-none text-2xl font-semibold tracking-wide text-brand-primary">
        floq
      </h1>

      {/* Right — connection / avatar */}
      <div className="flex items-center gap-2">
        {connectionLost && <WifiOff className="h-5 w-5 text-rose-400" />}
        <AvatarDropdown />
      </div>
    </header>
  );
};