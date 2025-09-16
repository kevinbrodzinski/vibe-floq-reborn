import * as React from "react";
import { Card } from "@/components/ui/card";
import { AvatarStack, AvatarItem } from "../visual/AvatarStack";
import { openFloqPeek } from "@/lib/peek";

type MetricType = "compatibility" | "friction" | "energy";

export interface MetricCardProps {
  type: MetricType;
  value: number; // Large display number (e.g., 3.4, 5.3, 3.6)
  percentage: number; // Progress percentage (0-100)
  count: number; // Bottom number (e.g., 53, 57, 93)
  friends?: AvatarItem[];
  floqId?: string;
}

const metricConfig = {
  compatibility: {
    label: "Compatibility",
    color: "hsl(180 70% 70%)", // cyan-ish
    bgColor: "hsl(180 70% 70% / 0.1)",
  },
  friction: {
    label: "Friction", 
    color: "hsl(280 90% 70%)", // purple-ish
    bgColor: "hsl(280 90% 70% / 0.1)",
  },
  energy: {
    label: "Energy",
    color: "hsl(120 70% 60%)", // green-ish
    bgColor: "hsl(120 70% 60% / 0.1)",
  },
} as const;

export function MetricCard({ type, value, percentage, count, friends = [], floqId }: MetricCardProps) {
  const config = metricConfig[type];
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card 
      className="relative p-4 bg-card/50 backdrop-blur border border-border/50 min-h-[140px] flex flex-col justify-between"
      style={{ backgroundColor: config.bgColor }}
    >
      {/* Circular progress indicator */}
      <div className="absolute top-2 right-2">
        <svg width="20" height="20" className="transform -rotate-90">
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke="hsl(var(--muted-foreground) / 0.3)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            stroke={config.color}
            strokeWidth="2"
            fill="none"
            strokeDasharray={50.265} // 2πr for r=8
            strokeDashoffset={50.265 - (percentage / 100) * 50.265}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center flex-1 space-y-1">
        {/* Large value */}
        <div 
          className="text-3xl font-bold"
          style={{ color: config.color }}
        >
          {value.toFixed(1)}
        </div>
        
        {/* Metric label */}
        <div className="text-xs text-muted-foreground font-medium">
          {config.label}
        </div>
        
        {/* Bottom stats */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>{percentage}%</span>
          <span>•</span>
          <span>{count}</span>
        </div>
      </div>

      {/* Friend avatars at bottom */}
      {friends.length > 0 && (
        <div className="mt-2 flex justify-center">
          <AvatarStack
            items={friends}
            max={3}
            size={16}
            overlap={6}
            onAvatarPress={(avatar) => openFloqPeek(avatar.floqId || floqId || "")}
          />
        </div>
      )}
    </Card>
  );
}