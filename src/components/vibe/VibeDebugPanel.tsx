import * as React from 'react';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { VIBES } from '@/lib/vibes';

export function VibeDebugPanel({ open = false }: { open?: boolean }) {
  const engine = useVibeEngine();
  if (!open || !engine) return null;
  const r = engine.productionReading;

  return (
    <div className="fixed top-20 right-4 z-[700] bg-black/80 text-white p-3 rounded-lg border border-white/10 w-72">
      <div className="font-semibold mb-1">Vibe Debug</div>
      <div className="text-sm mb-2">
        now: <span className="font-mono">{engine.currentVibe}</span> ({Math.floor(engine.confidence * 100)}%)
      </div>
      {r && (
        <>
          <div className="text-xs opacity-80 mb-2">calc: {r.calcMs.toFixed(1)}ms</div>
          <div className="text-xs mb-1">components:</div>
          <div className="grid grid-cols-2 gap-1 text-xs mb-2">
            {Object.entries(r.components).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="opacity-70">{k}</span>
                <span className="font-mono">{Math.floor(v * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="text-xs mb-1">vector:</div>
          <div className="grid grid-cols-3 gap-y-1 text-[11px]">
            {VIBES.map(v => (
              <div key={v} className="flex justify-between">
                <span className={`font-mono ${engine.currentVibe === v ? 'text-pink-400' : ''}`}>{v}</span>
                <span className="font-mono">{Math.floor((r.vector[v] ?? 0) * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}