import * as React from 'react';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { VIBES } from '@/lib/vibes';
import { Badge } from '@/components/ui/badge';

export function VibeDebugPanel({ open = false }: { open?: boolean }) {
  const engine = useVibeEngine();
  if (!open || !engine) return null;
  const r = engine.productionReading;

  return (
    <div className="fixed top-20 right-4 z-[700] bg-black/80 text-white p-3 rounded-lg border border-white/10 w-80">
      <div className="font-semibold mb-2">Vibe Debug</div>
      <div className="text-sm mb-2">
        now: <span className="font-mono">{engine.currentVibe}</span> ({Math.floor(engine.confidence * 100)}%)
      </div>
      
      {/* Pattern Intelligence Status */}
      {engine.patterns && (
        <div className="mb-3 p-2 bg-white/5 rounded border border-white/10">
          <div className="text-xs font-medium mb-1">Pattern Intelligence</div>
          <div className="flex flex-wrap gap-1 mb-1">
            <Badge variant="outline" className="text-[10px] h-5">
              {engine.patterns.chronotype}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              {engine.patterns.energyType}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              {engine.patterns.socialType}
            </Badge>
          </div>
          <div className="text-[10px] opacity-70">
            {engine.patterns.correctionCount} corrections • {engine.patterns.consistency}
          </div>
        </div>
      )}
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