import * as React from "react";
import { AvatarItem } from "./AvatarStack";

export function ConstellationMap({
  members,
  currentUserId,
  size = 120,
  className = "",
}: {
  members: AvatarItem[];
  currentUserId?: string;
  size?: number;
  className?: string;
}) {
  const positions = React.useMemo(() => {
    // Arrange members in a constellation pattern
    const center = size / 2;
    const radius = size * 0.3;
    
    return members.map((member, i) => {
      const isCurrentUser = member.id === currentUserId;
      
      if (isCurrentUser) {
        // Current user in center
        return { x: center, y: center, isUser: true };
      }
      
      // Others arranged in circle
      const angle = (i * 2 * Math.PI) / Math.max(1, members.length - 1);
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      
      return { x, y, isUser: false };
    });
  }, [members, currentUserId, size]);

  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-label="Member constellation"
    >
      {/* Connection lines */}
      <svg className="absolute inset-0" width={size} height={size}>
        {positions.map((pos, i) => 
          positions.slice(i + 1).map((otherPos, j) => (
            <line
              key={`${i}-${i + j + 1}`}
              x1={pos.x}
              y1={pos.y}
              x2={otherPos.x}
              y2={otherPos.y}
              stroke="hsl(var(--muted-foreground) / 0.2)"
              strokeWidth="1"
              className="animate-pulse"
            />
          ))
        )}
      </svg>

      {/* Member nodes */}
      {members.map((member, i) => {
        const pos = positions[i];
        const isCurrentUser = pos?.isUser;
        
        return (
          <div
            key={member.id}
            className={`absolute transition-all duration-500 ${
              isCurrentUser 
                ? "w-8 h-8 border-2 border-primary bg-primary/20" 
                : "w-6 h-6 border border-muted-foreground/50 bg-muted/50"
            } rounded-full flex items-center justify-center`}
            style={{
              left: (pos?.x || 0) - (isCurrentUser ? 16 : 12),
              top: (pos?.y || 0) - (isCurrentUser ? 16 : 12),
            }}
          >
            {isCurrentUser && (
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
}
