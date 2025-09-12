import * as React from 'react';
import { createRally, headsCentroid } from '@/lib/api/rally';
import { createRallyInboxThread } from '@/lib/api/rallyInbox';
import { useToast } from '@/hooks/use-toast';

type Heads = Array<{ friend_id: string; friend_name?: string; lng:number; lat:number; t_head:string }>;

function defaultTitle(args: { nearbyCount?: number }): string {
  const n = args.nearbyCount ?? 0;
  return n >= 2 ? `Rally near you (${n})` : 'Rally near you';
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

      // Create inbox thread
      const title = defaultTitle({ nearbyCount: heads.length });
      await createRallyInboxThread({
        rallyId,
        title,
        participants,
        centroid
      });

      toast({ title: 'Rally started', description: 'Your invitees have been pinged.' });

      // Broadcast rally start + inbox creation (for local UX hooks)
      window.dispatchEvent(new CustomEvent('floq:rally:start', {
        detail: { rallyId, participants, centroid, source: 'constellation' }
      }));

      window.dispatchEvent(new CustomEvent('floq:rally:inbox:new', {
        detail: { threadId: 'unknown', rallyId, participants, title } // your server returns the actual id
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