import * as React from 'react';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/hooks/use-toast';
import { createRally } from '@/lib/api/rally';
import { createRallyInboxThread } from '@/lib/api/rallyInbox';

type Props = { lng?: number | null; lat?: number | null; label?: string };

export function CreateSoloRallyChip({ lng, lat, label = 'Create Solo Rally' }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const hasCoords = Number.isFinite(lng) && Number.isFinite(lat);

  const onClick = async () => {
    if (busy || !hasCoords) return;
    setBusy(true);
    try {
      const center = { lng: Number(lng), lat: Number(lat) };
      // Solo: no recipients, friendly default note
      const { rallyId } = await createRally({ center, recipients: [], ttlMin: 60, note: 'Solo rally' });

      // Thread + inbox (safe wrapper returns optimistic id on failure)
      const { threadId } = await createRallyInboxThread({
        rallyId,
        title: 'Rally near you',
        participants: [],
        centroid: center,
      });

      // Map pan + pulse (event-driven)
      window.dispatchEvent(new CustomEvent('ui:map:flyTo', { detail: { ...center, zoom: 15 } }));
      window.dispatchEvent(new CustomEvent('ui:nav:dest', { detail: center }));
      window.dispatchEvent(new CustomEvent('floq:rally:inbox:new', {
        detail: { threadId, rallyId, participants: [], title: 'Rally near you' }
      }));

      toast({ title: 'Rally created', description: 'Solo rally is live' });
    } catch (e: any) {
      toast({ title: 'Could not create rally', description: e?.message ?? 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Chip
      color="indigo"
      onClick={onClick}
      icon={<span aria-hidden>⚡</span>}
      aria-label={hasCoords ? 'Create a solo Rally at this venue' : 'No location available'}
      aria-busy={busy || undefined}
      disabled={busy || !hasCoords}
      className="shrink-0"
      type="button"
    >
      {busy ? 'Starting…' : label}
    </Chip>
  );
}