import * as React from "react";
import { ProgressDonut } from "@/components/floqs/visual/ProgressDonut";

export function MetricChip({
  label,
  ringValue,
  text,
  live = true,
}: { label: string; ringValue: number; text: string; live?: boolean }) {
  const glowIntensity = Math.max(0.2, ringValue);
  const isHighValue = ringValue > 0.8;
  
  return (
    <div className={`
      relative flex items-center gap-2 rounded-full backdrop-blur-sm border transition-all duration-300
      ${live 
        ? 'bg-primary/10 border-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.3)]' 
        : 'bg-secondary/60 border-border'
      } 
      px-2.5 py-1 hover:scale-105 hover:shadow-lg
      ${isHighValue ? 'animate-pulse' : ''}
    `}>
      {/* Background glow for high values */}
      {isHighValue && live && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full -z-10 animate-glow-flow" />
      )}
      
      <div className="grid place-items-center h-5 w-5 relative">
        <ProgressDonut value={ringValue} size={18} stroke={3} live={live} />
        {/* Ring glow effect */}
        {live && ringValue > 0.6 && (
          <div className="absolute inset-0 rounded-full shadow-[0_0_6px_hsl(var(--primary)/0.4)]" />
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[11px] text-muted-foreground/80">{label}</span>
        <span className={`
          text-xs font-medium transition-colors duration-300
          ${isHighValue && live ? 'text-primary-foreground' : ''}
        `}>
          {text}
        </span>
      </div>
    </div>
  );
}