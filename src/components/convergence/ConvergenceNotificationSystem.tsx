import * as React from 'react';
import { Events, onEvent, emitEvent } from '@/services/eventBridge';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';

type Payload = {
  predictedLocation: { lng:number; lat:number; venueName?:string }
  friendId: string;
  friendName: string;
  probability: number;
  timeToMeet: number;
  confidence: number;
};

export function ConvergenceNotificationSystem() {
  const [evt, setEvt] = React.useState<Payload | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { success } = useEnhancedHaptics();

  React.useEffect(() => {
    // Typed subscription with auto-unsub
    return onEvent(Events.FLOQ_CONVERGENCE_DETECTED, (payload) => {
      setEvt(payload || null);
      // auto-dismiss after 10s
      window.setTimeout(() => setEvt(prev => prev && prev === payload ? null : prev), 10000);
    });
  }, []);

  const startRally = async () => {
    if (!evt || busy) return;
    setBusy(true);
    try {
      const center = evt.predictedLocation;
      
      // Emit rally creation events
      emitEvent(Events.UI_MAP_FLY_TO, { lng: center.lng, lat: center.lat, zoom: 16 });
      
      try { 
        success(); 
      } catch {}
      
      setEvt(null);
    } catch {
      setEvt(null);
    } finally {
      setBusy(false);
    }
  };

  if (!evt) return null;

  const minutes = Math.max(1, Math.ceil(evt.timeToMeet / 60));
  const probPct = Math.round(evt.probability * 100);

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 top-[calc(16px+env(safe-area-inset-top))] z-[605]
                 pointer-events-none w-[min(560px,calc(100vw-24px))]"
      aria-live="polite"
    >
      <div className="pointer-events-auto bg-card/90 border border-border rounded-xl shadow-xl
                      px-3 py-2 flex items-center gap-3">
        <div className="text-lg">⚡</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {evt.friendName === 'Friends'
              ? `You may meet nearby in ~${minutes} min`
              : `You might cross paths in ~${minutes} min`}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            Confidence {probPct}% {evt.predictedLocation.venueName ? `• near ${evt.predictedLocation.venueName}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEvt(null)}
            className="px-2 py-1 text-xs rounded-md border border-border hover:bg-foreground/5"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={startRally}
            disabled={busy}
            className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Start Rally'}
          </button>
        </div>
      </div>
    </div>
  );
}