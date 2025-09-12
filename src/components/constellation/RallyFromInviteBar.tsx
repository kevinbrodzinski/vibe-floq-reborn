import * as React from 'react';
import { createRally } from '@/lib/api/rally';
import { useToast } from '@/hooks/use-toast';

type Heads = Array<{ friend_id: string; friend_name?: string; lng:number; lat:number; t_head:string }>;

function headsCentroid(heads: Heads): { lng:number; lat:number } | null {
  if (!heads?.length) return null;
  const lng = heads.reduce((s,h)=>s+h.lng,0)/heads.length;
  const lat = heads.reduce((s,h)=>s+h.lat,0)/heads.length;
  return { lng, lat };
}

export function RallyFromInviteBar({
  heads,
  cohesion01,
  onDismiss,
}: {
  heads: Heads;
  cohesion01?: number;
  onDismiss?: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const participants = React.useMemo(() => heads.map(h => h.friend_id), [heads]);
  const centroid = React.useMemo(() => headsCentroid(heads), [heads]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { rallyId } = await createRally({
        center: centroid ?? { lng: 0, lat: 0 },
        recipients: participants,
        ttlMin: 60,
        note: (cohesion01 ?? 0) >= 0.55 ? 'High sync rally' : 'Friends rally'
      });
      toast({ title: 'Rally started', description: 'Your invitees have been pinged.' });
      // broadcast (optional)
      window.dispatchEvent(new CustomEvent('floq:rally:start', {
        detail: { rallyId, participants, centroid, source: 'constellation' }
      }));
      onDismiss?.();
    } catch (e:any) {
      toast({ title: 'Failed to start rally', description: e?.message ?? 'Please try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed left-4 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[610]">
      <div className="flex items-center gap-3 rounded-xl bg-card/90 border border-border backdrop-blur px-3 py-2">
        <div className="text-sm font-medium">
          {(cohesion01 ?? 0) >= 0.55 ? 'High sync detected — start a Rally?' : 'Friends are close — start a Rally?'}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-foreground/5"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            aria-label="Start Rally"
          >
            {busy ? 'Starting…' : 'Start Rally'}
          </button>
        </div>
      </div>
    </div>
  );
}