import * as React from "react";
export function PeakMarker({ energyNow, peakRatio }: { energyNow: number; peakRatio: number }) {
  // energyNow (0..1), peakRatio (0..1 of recent peak)
  const nowPct = Math.round(energyNow * 100);
  const peakPct = Math.round(peakRatio * 100);
  return (
    <div className="relative mt-2 h-2 w-full rounded bg-secondary">
      {/* current */}
      <div className="absolute left-0 top-0 h-2 rounded bg-[hsl(var(--accent))]" style={{ width: `${nowPct}%` }} />
      {/* peak tick */}
      <div className="absolute top-[-4px] h-4 w-[2px] bg-[hsl(var(--muted-foreground))]" style={{ left: `${peakPct}%` }} />
    </div>
  );
}