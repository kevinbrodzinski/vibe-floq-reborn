import * as React from 'react';
import { useFlowRoute } from '@/hooks/useFlowRoute';
import { emitEvent, Events } from '@/services/eventBridge';
import { resolveVibeColor } from '@/lib/vibe/vibeColor';

export function ContinuePatternChip() {
  const { getSuggestedNext } = useFlowRoute() as any;
  const [s, setS] = React.useState<any>(null);

  React.useEffect(() => {
    setS(getSuggestedNext?.() || null);
    const id = setInterval(() => setS(getSuggestedNext?.() || null), 8000);
    return () => clearInterval(id);
  }, [getSuggestedNext]);

  if (!s) return null;
  const color = resolveVibeColor({ vibeKey: (s.pattern as any)?.vibeKey, vibeHex: (s.pattern as any)?.vibeHex });

  return (
    <button
      type="button"
      onClick={() => emitEvent(Events.UI_VENUE_SELECT, { venueId: s.venueId })}
      className="fixed left-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[620] px-3 py-2 rounded-full border text-xs font-medium shadow-lg"
      style={{ background: '#0B0F1A', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
      aria-label="Continue pattern"
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
        Continue pattern
        <span className="opacity-70">• {(s.confidence*100|0)}%</span>
      </span>
    </button>
  );
}