import * as React from 'react';

interface FlowMomentumHUDProps {
  momentum: { dir: -1 | 0 | 1; mag: number };
  cohesion: { cohesion: number; nearby: number };
}

export function FlowMomentumHUD({ momentum, cohesion }: FlowMomentumHUDProps) {
  const arrow = momentum.dir > 0 ? '↗' : momentum.dir < 0 ? '↘' : '→';
  const arrowColor =
    momentum.dir > 0 ? 'text-green-400' :
    momentum.dir < 0 ? 'text-rose-400' :
    'text-slate-300';
  const barW = Math.round(Math.min(1, momentum.mag) * 100);

  const cohPct = Math.round(cohesion.cohesion * 100);

  return (
    <div className="fixed left-4 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-[560] flex gap-2">
      {/* Momentum indicator */}
      <div className="px-3 py-2 rounded-lg bg-black/50 backdrop-blur border border-white/10 text-white text-xs">
        <div className="flex items-center gap-2">
          <span className={`${arrowColor} font-bold text-sm`}>{arrow}</span>
          <div className="w-20 h-1.5 bg-white/10 rounded overflow-hidden">
            <div 
              className="h-full bg-white/80 rounded transition-all duration-300" 
              style={{ width: `${barW}%` }} 
            />
          </div>
          <span className="opacity-80 font-medium">Flow</span>
        </div>
      </div>
      
      {/* Cohesion indicator */}
      <div className="px-3 py-2 rounded-lg bg-black/50 backdrop-blur border border-white/10 text-white text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{cohPct}%</span>
          <span className="opacity-80 font-medium">Sync</span>
          {!!cohesion.nearby && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-medium">
              {cohesion.nearby}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}