import * as React from "react";
import { ProgressDonut } from "@/components/floqs/visual/ProgressDonut";

export function MetricChip({
  label,
  ringValue,       // 0..1
  text,            // "85%" | "Low" | "78%"
  live = true,
}: { label: string; ringValue: number; text: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-2.5 py-1">
      <div className="grid place-items-center h-5 w-5">
        <ProgressDonut value={ringValue} size={18} stroke={3} live={live} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{text}</span>
      </div>
    </div>
  );
}