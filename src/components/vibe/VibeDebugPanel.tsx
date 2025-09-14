import * as React from "react";
import { useVibeEngine } from "@/hooks/useVibeEngine";
import { VIBES } from "@/lib/vibes";

interface VibeDebugPanelProps {
  open?: boolean;
}

export function VibeDebugPanel({ open = false }: VibeDebugPanelProps) {
  const engine = useVibeEngine();
  if (!open || !engine) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-[650] rounded-xl bg-black/80 text-white p-3 text-xs border border-white/10">
      <div className="font-semibold">VibeDebug</div>
      <div>now: <b>{engine.currentVibe}</b> ({(engine.confidence*100).toFixed(0)}%)</div>
      <div className="mt-1">
        isDetecting: {engine.isDetecting ? 'true' : 'false'}
      </div>
      <div className="mt-1">vector:</div>
      <div className="grid grid-cols-4 gap-1 mt-1">
        {VIBES.map(v => (
          <div key={v} className="flex items-center justify-between gap-2">
            <span className="opacity-70">{v}</span>
            <span>{v === engine.currentVibe ? '●' : '○'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}