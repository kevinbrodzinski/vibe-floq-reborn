import { Badge } from "@/components/ui/badge";
import type { WalkableFloq } from "@/types";
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';

interface FloqOrbProps {
  floq: WalkableFloq;
  x: number;
  y: number;
  isWalkable?: boolean;
  onClick?: () => void;
}

export const FloqOrb = ({ floq, x, y, isWalkable = false, onClick }: FloqOrbProps) => {
  const color = vibeToHex(safeVibe(floq.primary_vibe));
  const size = Math.min(Math.max(40 + floq.participant_count * 8, 40), 100);
  
  return (
    <div
      className="absolute transition-all duration-500 cursor-pointer hover:scale-105 group"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        width: `${size}px`,
        height: `${size}px`,
      }}
      onClick={onClick}
    >
      <div className="relative w-full h-full animate-fade-in">
        {/* Outer ring - dashed if walkable */}
        <div 
          className={`absolute inset-0 border-2 rounded-full animate-pulse group-hover:border-primary/40 ${
            isWalkable 
              ? 'border-dashed border-primary/60' 
              : 'border-primary/20'
          }`}
        />
        
        {/* Middle ring */}
        <div className="absolute inset-2 border border-accent/30 rounded-full" />
        
        {/* Inner glowing core */}
        <div 
          className="absolute inset-6 rounded-full animate-pulse-glow group-hover:glow-active"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 30px ${color}40`
          }}
        />
        
        {/* Distance indicator for walkable floqs */}
        {isWalkable && (
          <div className="absolute -top-2 -right-2">
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
              {Math.round(floq.distance_meters)}m
            </Badge>
          </div>
        )}
      </div>
      
      {/* Title and info */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-smooth">
          {floq.title}
        </div>
        <div className="text-xs text-muted-foreground">
          {floq.participant_count} people
        </div>
      </div>
    </div>
  );
};