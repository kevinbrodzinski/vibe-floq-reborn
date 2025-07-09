import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";
import { AvatarDropdown } from "@/components/AvatarDropdown";

export const FieldHeader = () => {
  return (
    <header className="flex items-center justify-between px-4 pt-safe-top h-12 pointer-events-auto z-20 relative">
      {/* Left: Location */}
      <Button variant="ghost" className="flex items-center space-x-2 text-foreground hover:glow-secondary">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Downtown</span>
      </Button>
      
      {/* Center: Logo */}
      <div className="text-3xl font-light glow-primary">
        floq
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Search className="w-4 h-4" />
        </Button>
        <AvatarDropdown />
      </div>
    </header>
  );
};