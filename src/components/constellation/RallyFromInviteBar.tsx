import * as React from 'react';
import { createRally, headsCentroid } from '@/lib/api/rally';
import { createRallyInboxThread } from '@/lib/api/rallyInbox';
import { useToast } from '@/hooks/use-toast';
import { getCurrentMap } from '@/lib/geo/mapSingleton';

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
  // Primary centroid from heads
  const centroid = React.useMemo(() => headsCentroid(heads), [heads]);
  // Fallback centroid (solo): map center if no heads centroid is available
  const mapCenter = React.useMemo(() => {
    try {
      const c = getCurrentMap()?.getCenter?.();
      return c ? { lng: c.lng, lat: c.lat } : null;
    } catch {
      return null;
    }
  }, []);

  // SOLO SUPPORT: allow zero recipients; require either heads centroid OR map center
  const disabled = busy || (!centroid && !mapCenter);

  const start = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      const center = centroid ?? mapCenter ?? { lng: 0, lat: 0 };
      const { rallyId } = await createRally({
        center,
        recipients: participants, // may be []
        ttlMin: 60,
        note: (cohesion01 ?? 0) >= 0.55 ? 'High sync rally' : (participants.length ? 'Friends rally' : 'Solo rally')
      });

      // Create inbox thread
      const title = defaultTitle({ nearbyCount: heads.length });
      const { threadId } = await createRallyInboxThread({
        rallyId,
        title,
        participants,
        centroid: center
      });

      toast({ title: 'Rally started', description: 'Your invitees have been pinged.' });

      // Broadcast rally start event
      window.dispatchEvent(new CustomEvent('floq:rally:start', {
        detail: { rallyId, participants, centroid: center, source: 'constellation' }
      }));

      // Announce inbox thread creation
      window.dispatchEvent(new CustomEvent('floq:rally:inbox:new', {
        detail: { threadId, rallyId, participants, title }
      }));

      onDismiss?.();
    } catch (e:any) {
      toast({ title: 'Failed to start rally', description: e?.message ?? 'Please try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // Banner copy:
  // - If we have heads: keep the original "friends" copy
  // - If no heads: solo-friendly prompt
  const bannerText =
    heads.length > 0
      ? ((cohesion01 ?? 0) >= 0.55
          ? 'High sync detected — start a Rally?'
          : 'Friends are close — start a Rally?')
      : 'Start a Rally?';

  return (
    <div className="fixed left-4 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[610]">
      <div className="flex items-center gap-3 rounded-xl bg-card/90 border border-border backdrop-blur px-3 py-2">
        <div className="text-sm font-medium">{bannerText}</div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={busy ? undefined : onDismiss}
            disabled={busy}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-foreground/5 disabled:opacity-60"
            aria-disabled={busy || undefined}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            aria-label={heads.length ? 'Start Rally with nearby friends' : 'Start a solo Rally'}
          >
            {busy ? 'Starting…' : 'Start Rally'}
          </button>
        </div>
      </div>
    </div>
  );
}