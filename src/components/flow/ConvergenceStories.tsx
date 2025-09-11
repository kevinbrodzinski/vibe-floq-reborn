import * as React from 'react';
import type { LatLng } from '@/lib/flow/reflection/useConvergenceStories';

type ConvergenceStory = {
  at: number;
  energy: number;
  venue: { id: string; name: string } | null;
  dwellMin: number | null;
  categories?: string[];
  nearby: LatLng;
  headline: string;
  subline: string;
};

export function ConvergenceStories({
  stories,
  onViewMap,
  className = ''
}: {
  stories: ConvergenceStory[];
  onViewMap?: (s: ConvergenceStory) => void;
  className?: string;
}) {
  if (!stories?.length) return null;

  const share = async (s: ConvergenceStory) => {
    const text = `${s.headline}\n${s.subline}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My Flow Story', text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <section className={className}>
      <h3 className="text-sm font-semibold text-foreground mb-2">Convergence Stories</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {stories.map((s, i) => (
          <div key={`${s.at}-${i}`} className="relative rounded-xl border border-border bg-card/40 p-3">
            <div className="absolute inset-0 rounded-xl shadow-[0_0_40px_hsl(var(--primary)/0.08)_inset] pointer-events-none"/>
            <div className="flex items-center justify-between">
              <div className="text-foreground font-medium">{s.headline}</div>
              <div className="text-xs text-muted-foreground">{Math.round(s.energy * 100)}%</div>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.subline}</div>
            <div className="mt-2 flex gap-2">
              <button 
                onClick={() => share(s)} 
                className="px-2 py-1 text-[11px] rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                Share
              </button>
              {onViewMap && (
                <button 
                  onClick={() => onViewMap(s)} 
                  className="px-2 py-1 text-[11px] rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                >
                  View on map
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}