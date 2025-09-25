import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConstellation, type ConstellationEdge } from '@/lib/api/constellationClient';
import { ConstellationCanvas } from './ConstellationCanvas';
import { QuickInvitePopover } from './QuickInvitePopover';
import { useToast } from '@/hooks/use-toast';
import { RallyFromInviteBar } from '@/components/constellation/RallyFromInviteBar';

type Party = { id: string; mass?: number; vibe?: string };

export function ConstellationController({
  active, party, edges = [], seed,
  onInvite
}: {
  active: boolean;
  party: Party[];
  edges?: ConstellationEdge[];
  seed?: string;
  onInvite?: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showInvite, setShowInvite] = React.useState(false);
  const [invite, setInvite] = React.useState<any | null>(null);
  const { toast } = useToast();

  // Pick up buffered payload if we navigated here after the event
  React.useEffect(() => {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage?.getItem('floq:lastInvitePayload') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        setInvite(parsed);
        sessionStorage.removeItem('floq:lastInvitePayload');
      }
    } catch {}
  }, []);

  // Also capture live events if constellation is already mounted
  React.useEffect(() => {
    const onInviteNearby = (e: WindowEventMap['floq:invite-nearby']) => setInvite(e.detail);
    window.addEventListener('floq:invite-nearby', onInviteNearby as EventListener);
    return () => window.removeEventListener('floq:invite-nearby', onInviteNearby as EventListener);
  }, []);

  const q = useQuery({
    queryKey: ['constellation', party.map(p => p.id).join(','), edges.length, seed],
    queryFn: () => fetchConstellation({ party, edges, seed }),
    staleTime: 120_000,
    enabled: active && party.length > 0,
  });

  const hitRef = React.useRef<HTMLDivElement | null>(null);

  const onClick = (e: React.MouseEvent) => {
    if (!q.data?.nodes?.length) return;
    const box = hitRef.current?.getBoundingClientRect(); if (!box) return;
    const x = e.clientX - box.left, y = e.clientY - box.top;
    const w = box.width, h = box.height;

    let bestId: string | null = null, bestD = Infinity;
    for (const n of q.data.nodes) {
      const nx = n.pos[0] * w, ny = n.pos[1] * h;
      const r = 12 + (n.mass ?? 1) * 4;
      const d = (nx - x) ** 2 + (ny - y) ** 2;
      if (d <= r * r && d < bestD) { bestD = d; bestId = n.id; }
    }
    if (bestId) { setSelectedId(bestId); setShowInvite(true); }
  };

  const closePopover = () => setShowInvite(false);
  const sendInvite = (id: string) => { onInvite?.(id); setShowInvite(false); };

  const handleRetryVenue = React.useCallback(async () => {
    try {
      toast({ title: 'Refreshing picks…' });
      // Mock retry - in a real app this would call your actual redecorator
      await new Promise(resolve => setTimeout(resolve, 800));
      return [];
    } catch {
      toast({ title: 'Retry failed', variant: 'destructive' });
      return [];
    }
  }, [toast]);

  return (
    <>
      <ConstellationCanvas
        active={active}
        party={party}
        edges={edges}
        seed={seed}
        highlightId={selectedId ?? undefined}
      />
      <div
        ref={hitRef}
        onClick={active ? onClick : undefined}
        style={{ position:'absolute', inset:0, zIndex:590, pointerEvents: active ? 'auto' : 'none', background:'transparent' }}
      />
      {showInvite && selectedId && (
        <QuickInvitePopover
          userId={selectedId}
          onClose={closePopover}
          onInvite={sendInvite}
          onRetryVenue={handleRetryVenue}
        />
      )}
      {invite && invite.heads?.length > 0 && (
        <RallyFromInviteBar
          heads={invite.heads}
          cohesion01={invite.cohesion01}
          onDismiss={() => setInvite(null)}
        />
      )}
    </>
  );
}